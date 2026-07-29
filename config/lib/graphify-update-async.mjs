import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  openSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WORKER_FLAG = '--worker';
const STALE_LOCK_MS = 30 * 60_000;

function graphPath(root) {
  return join(root, 'graphify-out', 'graph.json');
}

function powershellLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function acquireLock(lockPath, now = Date.now()) {
  try {
    closeSync(openSync(lockPath, 'wx'));
    return true;
  } catch (error) {
    if (error?.code !== 'EEXIST') return false;
  }

  try {
    if (now - statSync(lockPath).mtimeMs <= STALE_LOCK_MS) return false;
    unlinkSync(lockPath);
    closeSync(openSync(lockPath, 'wx'));
    return true;
  } catch {
    return false;
  }
}

export function startGraphifyUpdate(
  directory = process.cwd(),
  {
    spawnImpl = spawn,
    spawnSyncImpl = spawnSync,
    modulePath = fileURLToPath(import.meta.url),
    platform = process.platform,
  } = {},
) {
  const root = resolve(directory);
  if (!existsSync(graphPath(root))) {
    return { started: false, reason: 'missing-graph' };
  }

  try {
    if (platform === 'win32') {
      const command =
        `Start-Process -FilePath ${powershellLiteral(process.execPath)} ` +
        `-ArgumentList @(${[
          modulePath,
          WORKER_FLAG,
          root,
        ].map(powershellLiteral).join(',')}) ` +
        `-WorkingDirectory ${powershellLiteral(root)} -WindowStyle Hidden`;
      const result = spawnSyncImpl(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle',
          'Hidden',
          '-Command',
          command,
        ],
        {
          cwd: root,
          stdio: 'ignore',
          windowsHide: true,
        },
      );
      return result?.status === 0
        ? { started: true }
        : { started: false, reason: 'launch-failed' };
    }

    const child = spawnImpl(
      process.execPath,
      [modulePath, WORKER_FLAG, root],
      {
        cwd: root,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      },
    );
    child.unref();
    return { started: true, pid: child.pid };
  } catch {
    return { started: false, reason: 'launch-failed' };
  }
}

export async function runGraphifyUpdateWorker(
  directory,
  { spawnImpl = spawn } = {},
) {
  const root = resolve(directory);
  if (!existsSync(graphPath(root))) return false;
  const lockPath = join(dirname(graphPath(root)), '.graphify-update.lock');
  if (!acquireLock(lockPath)) return false;

  try {
    const child = spawnImpl('graphify', ['update', root], {
      cwd: root,
      stdio: 'ignore',
      windowsHide: true,
    });
    await new Promise((resolveWorker) => {
      child.once('error', resolveWorker);
      child.once('exit', resolveWorker);
    });
    return true;
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {}
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';
if (invokedPath === import.meta.url) {
  if (process.argv[2] === WORKER_FLAG && process.argv[3]) {
    await runGraphifyUpdateWorker(process.argv[3]);
  } else {
    startGraphifyUpdate(process.argv[2] || process.cwd());
  }
}
