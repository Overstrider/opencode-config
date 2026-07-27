import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

const WINDOWS_ABSOLUTE_PATH = /\b[A-Za-z]:\\[^"'`\r\n]+/;
const USER_PROFILE_PATH = /(?:\bC:\\Users\\|\/home\/|\/Users\/)[^"'`\s]+/i;

test('9router source and documentation contain no machine-local paths', () => {
  for (const file of [
    'config/plugins/9router-autostart.mjs',
    'README.md',
    '.docs/features/installation-and-updates.md',
  ]) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, WINDOWS_ABSOLUTE_PATH, file);
    assert.doesNotMatch(content, USER_PROFILE_PATH, file);
  }
});

test('machine-local 9router configuration is ignored by Git', () => {
  const tracked = execFileSync('git', ['ls-files'], {
    encoding: 'utf8',
  }).split(/\r?\n/);

  assert.ok(!tracked.includes('config/9router.local.json'));
  assert.ok(fs.existsSync('config/9router.local.example.json'));
});
