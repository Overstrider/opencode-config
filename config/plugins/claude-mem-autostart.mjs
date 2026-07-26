// User-global claude-mem lifecycle/context bridge.
//
// The official bundled plugin captures OpenCode activity and exposes
// claude_mem_search. This companion starts the local worker when OpenCode
// loads and injects fresh project memory into every system prompt.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workerScript = path.resolve(
  here,
  '..',
  'node_modules',
  'claude-mem',
  'plugin',
  'scripts',
  'worker-service.cjs',
);
const dataDir = process.env.CLAUDE_MEM_DATA_DIR ||
  path.join(os.homedir(), '.claude-mem');
const settingsPath = path.join(dataDir, 'settings.json');

let startAttempted = false;

function workerEndpoint() {
  let settings = {};
  try {
    settings = JSON.parse(
      fs.readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, ''),
    );
  } catch {}

  const host = process.env.CLAUDE_MEM_WORKER_HOST ||
    settings.CLAUDE_MEM_WORKER_HOST ||
    '127.0.0.1';
  const port = process.env.CLAUDE_MEM_WORKER_PORT ||
    settings.CLAUDE_MEM_WORKER_PORT ||
    '37777';
  return `http://${host}:${port}`;
}

async function isReady() {
  try {
    const response = await fetch(`${workerEndpoint()}/api/readiness`, {
      signal: AbortSignal.timeout(750),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function startWorker() {
  if (startAttempted || !fs.existsSync(workerScript)) return;
  startAttempted = true;

  const bun = process.env.BUN_INSTALL
    ? path.join(
        process.env.BUN_INSTALL,
        'bin',
        process.platform === 'win32' ? 'bun.exe' : 'bun',
      )
    : 'bun';

  const child = spawn(bun, [workerScript, 'start'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env },
  });
  child.unref();
}

async function ensureWorker() {
  if (!(await isReady())) startWorker();
}

export default async ({ project, directory = process.cwd() } = {}) => {
  const projectName = project?.name || path.basename(directory) || 'opencode';
  void ensureWorker();

  return {
    event: async ({ event } = {}) => {
      if (event?.type === 'session.created') void ensureWorker();
    },

    'chat.message': async () => {
      void ensureWorker();
    },

    'experimental.chat.system.transform': async (_input, output) => {
      if (!output || !Array.isArray(output.system)) return;
      await ensureWorker();

      try {
        const response = await fetch(
          `${workerEndpoint()}/api/context/inject?project=${encodeURIComponent(projectName)}`,
          { signal: AbortSignal.timeout(3000) },
        );
        if (!response.ok) return;
        const context = (await response.text()).trim();
        if (context) {
          output.system.push(
            'CLAUDE-MEM USER-LEVEL MEMORY. Treat as historical context, verify against current code, and never expose stored secrets.\n\n' +
            context,
          );
        }
      } catch {}
    },
  };
};
