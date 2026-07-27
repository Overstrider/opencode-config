// 9router local autostart.
//
// Every OpenCode provider here points at http://127.0.0.1:20128/v1. If that
// local 9router isn't up, all models fail. This plugin checks health on load
// and on each new session, and starts 9router (detached, hidden) if configured.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HEALTH = 'http://127.0.0.1:20128/v1/models';
const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_CONFIG = path.resolve(PLUGIN_DIR, '..', '9router.local.json');

let startAttempted = false;
let missingConfigReported = false;

function routerDirectory() {
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

  const directory = routerDirectory();
  const cli = directory
    ? path.join(directory, 'node_modules', '9router', 'cli.js')
    : '';
  if (!cli || !fs.existsSync(cli)) {
    if (!missingConfigReported) {
      missingConfigReported = true;
      console.warn(
        '[9router-autostart] Configure OPENCODE_9ROUTER_DIR or '
        + 'config/9router.local.json to enable autostart.',
      );
    }
    return;
  }

  const child = spawn(process.execPath, [
    cli,
    '--port', '20128',
    '--host', '127.0.0.1',
    '--no-browser',
    '--skip-update',
    '--log',
  ], {
    cwd: directory,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env },
  });
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
