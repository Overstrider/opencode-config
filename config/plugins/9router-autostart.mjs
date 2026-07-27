// 9router local autostart.
//
// OpenCode providers point at http://127.0.0.1:20128/v1. This plugin checks
// health on load and on each new session, then starts either a configured
// checkout or the globally installed 9router executable.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HEALTH = 'http://127.0.0.1:20128/v1/models';
const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_CONFIG = path.resolve(PLUGIN_DIR, '..', '9router.local.json');

let startAttempted = false;
let missingInstallReported = false;

function configuredDirectory() {
  const environmentDirectory = process.env.OPENCODE_9ROUTER_DIR?.trim();
  if (environmentDirectory) return environmentDirectory;

  try {
    const localConfig = JSON.parse(fs.readFileSync(LOCAL_CONFIG, 'utf8'));
    return typeof localConfig.directory === 'string'
      ? localConfig.directory.trim()
      : '';
  } catch {
    return '';
  }
}

function globalExecutable() {
  const names = process.platform === 'win32'
    ? ['9router.cmd', '9router.exe', '9router']
    : ['9router'];

  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!directory) continue;
    for (const name of names) {
      const candidate = path.join(directory, name);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {}
    }
  }
  return '';
}

function launchTarget() {
  const directory = configuredDirectory();
  const localCli = directory
    ? path.join(directory, 'node_modules', '9router', 'cli.js')
    : '';
  if (localCli && fs.existsSync(localCli)) {
    return {
      command: process.execPath,
      args: [localCli],
      cwd: directory,
    };
  }

  const executable = globalExecutable();
  return executable
    ? { command: executable, args: [], cwd: undefined }
    : undefined;
}

async function isUp() {
  try {
    const response = await fetch(HEALTH, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function start9router() {
  if (startAttempted) return;
  startAttempted = true;

  const target = launchTarget();
  if (!target) {
    if (!missingInstallReported) {
      missingInstallReported = true;
      console.warn(
        '[9router-autostart] Run setup-9router.sh, install 9router globally, '
        + 'or configure config/9router.local.json.',
      );
    }
    return;
  }

  const child = spawn(target.command, [
    ...target.args,
    '--port', '20128',
    '--host', '127.0.0.1',
    '--no-browser',
    '--skip-update',
    '--log',
  ], {
    cwd: target.cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env },
  });
  child.on('error', () => {});
  child.unref();
}

async function ensure9router() {
  if (!(await isUp())) start9router();
}

export default async () => {
  void ensure9router();

  return {
    event: async ({ event } = {}) => {
      if (event?.type === 'session.created') void ensure9router();
    },
    'chat.message': async () => {
      void ensure9router();
    },
  };
};
