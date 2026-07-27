import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

const WINDOWS_ABSOLUTE_PATH = /\b[A-Za-z]:\\[^"'`\r\n]+/;
const USER_PROFILE_PATH = /(?:\bC:\\Users\\|\/home\/|\/Users\/)[^"'`\s]+/i;

test('source and documentation contain no machine-local paths', () => {
  for (const file of [
    'config/opencode.json',
    'README.md',
    '.docs/features/installation-and-updates.md',
  ]) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, WINDOWS_ABSOLUTE_PATH, file);
    assert.doesNotMatch(content, USER_PROFILE_PATH, file);
  }
});

test('machine-local Copilot credential is ignored by Git', () => {
  const tracked = execFileSync('git', ['ls-files'], {
    encoding: 'utf8',
  }).split(/\r?\n/);

  assert.ok(!tracked.includes('config/copilot.key'));
  assert.ok(fs.existsSync('config/copilot.key.example'));
});

test('minimal branch uses direct Copilot without auxiliary model services', () => {
  const config = JSON.parse(fs.readFileSync('config/opencode.json', 'utf8'));
  const serialized = JSON.stringify(config);

  assert.doesNotMatch(serialized, /openrouter/i);
  assert.doesNotMatch(serialized, /prompt-enhancer/i);
  assert.doesNotMatch(serialized, /claude-mem/i);
  assert.doesNotMatch(serialized, /9router/i);
  assert.deepEqual(config.enabled_providers, ['copilot']);
  assert.equal(config.model, 'copilot/gpt-5.4');
  assert.equal(
    config.provider.copilot.options.apiKey,
    '{file:./copilot.key}',
  );
  assert.ok(fs.existsSync('config/copilot.key.example'));
});
