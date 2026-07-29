import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { startGraphifyUpdate } from '../config/lib/graphify-update-async.mjs';

test('Graphify update launcher detaches and returns without waiting', () => {
  const root = join(
    tmpdir(),
    `graphify-async-${process.pid}-${Date.now()}`,
  );
  mkdirSync(join(root, 'graphify-out'), { recursive: true });
  writeFileSync(join(root, 'graphify-out', 'graph.json'), '{}');

  const calls = [];
  let unrefCalled = false;
  const result = startGraphifyUpdate(root, {
    modulePath: 'C:\\config\\graphify-update-async.mjs',
    platform: 'linux',
    spawnImpl: (...args) => {
      calls.push(args);
      return {
        pid: 42,
        unref: () => {
          unrefCalled = true;
        },
      };
    },
  });

  assert.deepEqual(result, { started: true, pid: 42 });
  assert.equal(unrefCalled, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], process.execPath);
  assert.deepEqual(
    calls[0][1],
    ['C:\\config\\graphify-update-async.mjs', '--worker', root],
  );
  assert.equal(calls[0][2].detached, true);
  assert.equal(calls[0][2].stdio, 'ignore');
  assert.equal(calls[0][2].windowsHide, true);
});

test('Windows launcher uses hidden Start-Process to escape the host job', () => {
  const root = join(
    tmpdir(),
    `graphify-async-win-${process.pid}-${Date.now()}`,
  );
  mkdirSync(join(root, 'graphify-out'), { recursive: true });
  writeFileSync(join(root, 'graphify-out', 'graph.json'), '{}');

  const calls = [];
  const result = startGraphifyUpdate(root, {
    modulePath: 'C:\\config\\graphify-update-async.mjs',
    platform: 'win32',
    spawnSyncImpl: (...args) => {
      calls.push(args);
      return { status: 0 };
    },
  });

  assert.deepEqual(result, { started: true });
  assert.equal(calls[0][0], 'powershell.exe');
  assert.match(calls[0][1].at(-1), /Start-Process/);
  assert.match(calls[0][1].at(-1), /-WindowStyle Hidden/);
  assert.equal(calls[0][2].stdio, 'ignore');
});
