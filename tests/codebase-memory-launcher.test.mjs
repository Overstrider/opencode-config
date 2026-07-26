import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  findProjectRoot,
  validateMcpRequest,
  validateWorkspace,
} from '../config/lib/codebase-memory-launcher.mjs';

const fixtureRoot = join(tmpdir(), `cbm-launcher-${process.pid}`);
const home = join(fixtureRoot, 'home');
const project = join(home, 'repos', 'project');
const nested = join(project, 'src', 'feature');

mkdirSync(nested, { recursive: true });
writeFileSync(join(project, 'package.json'), '{}');

test('finds the nearest project root from a nested OpenCode directory', () => {
  assert.equal(findProjectRoot(nested), project);
});

test('allows a marked project and confines it to that root', () => {
  assert.deepEqual(
    validateWorkspace(nested, { home, temp: join(fixtureRoot, 'temp') }),
    { ok: true, workspace: project },
  );
});

test('blocks home, AppData, temp, and unmarked folders', () => {
  writeFileSync(join(home, 'package.json'), '{}');
  assert.equal(validateWorkspace(home, { home, temp: join(fixtureRoot, 'temp') }).ok, false);

  const appDataProject = join(home, 'AppData', 'Local', 'project');
  mkdirSync(appDataProject, { recursive: true });
  writeFileSync(join(appDataProject, 'package.json'), '{}');
  assert.equal(validateWorkspace(appDataProject, { home, temp: join(fixtureRoot, 'temp') }).ok, false);

  const tempProject = join(fixtureRoot, 'temp', 'project');
  mkdirSync(tempProject, { recursive: true });
  writeFileSync(join(tempProject, 'package.json'), '{}');
  assert.equal(validateWorkspace(tempProject, { home, temp: join(fixtureRoot, 'temp') }).ok, false);

  assert.equal(
    validateWorkspace(join(home, 'unmarked'), {
      home,
      temp: join(fixtureRoot, 'temp'),
    }).ok,
    false,
  );
});

test('MCP proxy permits only the current project root for indexing', () => {
  const request = (repoPath) => ({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: {
      name: 'index_repository',
      arguments: { repo_path: repoPath },
    },
  });

  assert.equal(validateMcpRequest(request(project), project).ok, true);
  assert.equal(validateMcpRequest(request('.'), project).ok, true);
  assert.equal(validateMcpRequest(request(home), project).ok, false);
  assert.equal(validateMcpRequest(request(join(project, 'src')), project).ok, false);
  assert.equal(
    validateMcpRequest({ method: 'tools/call', params: { name: 'search_graph' } }, project).ok,
    true,
  );
});
