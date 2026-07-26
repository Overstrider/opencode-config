// 9router local autostart.
//
// Every OpenCode provider here points at http://127.0.0.1:20128/v1. If that
// local 9router isn't up, all models fail. This plugin checks health on load
// and on each new session, and starts 9router (detached, hidden) if it's down.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROUTER_DIR = 'REDACTED_LOCAL_PATH';
const CLI = path.join(ROUTER_DIR, 'node_modules', '9router', 'cli.js');
const HEALTH = 'http://127.0.0.1:20128/v1/models';

const ARGS = [
  CLI,
  '--port', '20128',
  '--host', '127.0.0.1',
  '--no-browser',
  '--skip-update',
  '--log',
];

let startAttempted = false;

async function isUp() {
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(1000) });
    return r.ok;
  } catch {
    return false;
  }
}

function start9router() {
  if (startAttempted || !fs.existsSync(CLI)) return;
  startAttempted = true;

  const child = spawn(process.execPath, ARGS, {
    cwd: ROUTER_DIR,
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
