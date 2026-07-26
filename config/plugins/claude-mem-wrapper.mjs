import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function applyWorkerSettings() {
  const dataDir = process.env.CLAUDE_MEM_DATA_DIR ||
    path.join(os.homedir(), '.claude-mem');
  try {
    const settings = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8')
        .replace(/^\uFEFF/, ''),
    );
    for (const key of [
      'CLAUDE_MEM_DATA_DIR',
      'CLAUDE_MEM_WORKER_HOST',
      'CLAUDE_MEM_WORKER_PORT',
    ]) {
      if (settings[key]) {
        process.env[key] = String(settings[key]);
      }
    }
  } catch {}
}

export default async function ClaudeMemWrapper(context = {}) {
  applyWorkerSettings();
  const { default: ClaudeMemPlugin } = await import('../vendor/claude-mem.js');
  return ClaudeMemPlugin(context);
}
