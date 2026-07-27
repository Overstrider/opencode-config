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

test('installers restore pinned 9router without tracking credentials', () => {
  const version = fs.readFileSync('.9router-version', 'utf8').trim();
  assert.match(version, /^\d+\.\d+\.\d+$/);

  for (const file of ['install.sh', 'update.sh']) {
    assert.match(fs.readFileSync(file, 'utf8'), /setup-9router\.sh/);
  }
  for (const file of ['install.ps1', 'update.ps1']) {
    assert.match(fs.readFileSync(file, 'utf8'), /setup-9router\.ps1/);
  }

  const bootstrap = fs.readFileSync('bootstrap.sh', 'utf8');
  assert.match(bootstrap, /read -r -s/);
  assert.match(bootstrap, /umask 077/);
  assert.doesNotMatch(bootstrap, /echo.*openrouter_key/i);
});
