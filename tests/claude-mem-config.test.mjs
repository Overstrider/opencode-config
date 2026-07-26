import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import * as claudeMemWrapper from '../config/plugins/claude-mem-wrapper.mjs';

const powershell = readFileSync(
  new URL('../setup-integrations.ps1', import.meta.url),
  'utf8',
);
const shell = readFileSync(
  new URL('../setup-integrations.sh', import.meta.url),
  'utf8',
);

for (const [name, source] of [
  ['PowerShell installer', powershell],
  ['shell installer', shell],
]) {
  test(`${name} fixes claude-mem to OpenRouter Qwen3.6`, () => {
    assert.match(source, /CLAUDE_MEM_PROVIDER[^\r\n]*["']openrouter["']/);
    assert.match(source, /qwen\/qwen3\.6-35b-a3b/);
    assert.match(source, /CLAUDE_MEM_OPENROUTER_MODEL/);
    assert.match(source, /CLAUDE_MEM_MODEL_PROFILE/);
    assert.match(
      source,
      /CLAUDE_MEM_MAX_CONCURRENT_AGENTS[^\r\n]*["']1["']/,
    );
    assert.match(
      source,
      /CLAUDE_MEM_TIER_ROUTING_ENABLED[^\r\n]*["']false["']/,
    );
    assert.doesNotMatch(source, /CLAUDE_MEM_TIER_ROUTING_ENABLED.*true/i);
    assert.doesNotMatch(source, /kimi\/kimi-k2\.7-code-highspeed/);
    assert.doesNotMatch(source, /cx\/gpt-5\.4-mini/);
    assert.match(source, /configure-claude-mem-env\.mjs/);
    assert.match(source, /bun\s+[^\r\n]+\s+restart/);
  });
}

test('OpenCode loads claude-mem through a default-only wrapper', () => {
  assert.deepEqual(Object.keys(claudeMemWrapper), ['default']);
  assert.equal(typeof claudeMemWrapper.default, 'function');
});

test('OpenCode wrapper overrides a stale inherited worker endpoint', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'claude-mem-wrapper-'));
  const keys = [
    'CLAUDE_MEM_DATA_DIR',
    'CLAUDE_MEM_WORKER_HOST',
    'CLAUDE_MEM_WORKER_PORT',
  ];
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );

  try {
    writeFileSync(
      join(dataDir, 'settings.json'),
      `\uFEFF${JSON.stringify({
        CLAUDE_MEM_DATA_DIR: dataDir,
        CLAUDE_MEM_WORKER_HOST: '127.0.0.1',
        CLAUDE_MEM_WORKER_PORT: '37778',
      })}`,
    );
    process.env.CLAUDE_MEM_DATA_DIR = dataDir;
    process.env.CLAUDE_MEM_WORKER_HOST = 'localhost';
    process.env.CLAUDE_MEM_WORKER_PORT = '37777';

    await claudeMemWrapper.default({
      directory: dataDir,
      project: { name: 'wrapper-test' },
    });

    assert.equal(process.env.CLAUDE_MEM_DATA_DIR, dataDir);
    assert.equal(process.env.CLAUDE_MEM_WORKER_HOST, '127.0.0.1');
    assert.equal(process.env.CLAUDE_MEM_WORKER_PORT, '37778');
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('claude-mem env configurator preserves unrelated values', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'claude-mem-env-'));
  const script = fileURLToPath(
    new URL('../scripts/configure-claude-mem-env.mjs', import.meta.url),
  );
  const fakeKey = 'test-openrouter-key';

  try {
    writeFileSync(
      join(dataDir, '.env'),
      '\uFEFFKEEP_ME=1\nANTHROPIC_BASE_URL=http://localhost\n' +
        'OPENROUTER_API_KEY=old-key\n',
    );
    const result = spawnSync(process.execPath, [script, dataDir], {
      encoding: 'utf8',
      env: { ...process.env, OPENROUTER_API_KEY: fakeKey },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, new RegExp(fakeKey));
    assert.equal(
      readFileSync(join(dataDir, '.env'), 'utf8'),
      'KEEP_ME=1\n\n# OpenRouter credential for claude-mem.\n' +
        `OPENROUTER_API_KEY=${fakeKey}\n`,
    );
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
