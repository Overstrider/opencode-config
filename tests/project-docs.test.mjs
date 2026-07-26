import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import ProjectDocsPlugin from '../config/plugins/project-docs-hook.mjs';
import {
  DOC_TEMPLATES,
  LOCAL_AGENTS_BEGIN,
  ensureProjectDocs,
} from '../config/skills/project-docs/scripts/scaffold.mjs';
import {
  FALLBACK_AGENT,
  PRIMARY_AGENT,
  createProjectDocsHooks,
} from '../config/skills/project-docs/scripts/hook-core.mjs';

function temporaryRoot(t) {
  const root = mkdtempSync(join(tmpdir(), 'project-docs-test-'));
  t.after(() => {
    const resolved = join(tmpdir(), root.slice(tmpdir().length));
    assert.equal(resolved, root);
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

async function waitFor(predicate, message, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail(message);
}

function messagePair(assistantID, userText = 'user request', assistantText = 'done') {
  return [
    {
      info: {
        id: `user-${assistantID}`,
        role: 'user',
        time: { created: 1 },
      },
      parts: [{ type: 'text', text: userText }],
    },
    {
      info: {
        id: assistantID,
        role: 'assistant',
        time: { created: 2, completed: 3 },
        finish: 'stop',
      },
      parts: [{ type: 'text', text: assistantText }],
    },
  ];
}

function mockClient() {
  const sessions = new Map();
  const messages = new Map();
  const dispatches = [];
  const promptErrors = new Map();
  const toasts = [];
  const aborts = [];
  let sequence = 0;

  return {
    sessions,
    messages,
    dispatches,
    promptErrors,
    toasts,
    aborts,
    client: {
      session: {
        get: async ({ path }) => ({ data: sessions.get(path.id) }),
        messages: async ({ path }) => ({ data: messages.get(path.id) || [] }),
        diff: async () => ({
          data: [{ file: 'src/example.js', additions: 2, deletions: 1 }],
        }),
        create: async ({ body, query }) => {
          sequence += 1;
          const session = {
            id: `background-${sequence}`,
            parentID: body.parentID,
            directory: query.directory,
            title: body.title,
          };
          sessions.set(session.id, session);
          return { data: session };
        },
        promptAsync: async (args) => {
          dispatches.push(args);
          const error = promptErrors.get(args.body.agent);
          return error ? { error } : {};
        },
        abort: async ({ path }) => {
          aborts.push(path.id);
          return { data: true };
        },
      },
      tui: {
        showToast: async ({ body }) => {
          toasts.push(body);
          return { data: true };
        },
      },
    },
  };
}

test('scaffold creates the complete tree and is idempotent', (t) => {
  const root = temporaryRoot(t);
  const first = ensureProjectDocs(root);

  assert.ok(existsSync(join(root, '.docs', 'features')));
  for (const name of Object.keys(DOC_TEMPLATES)) {
    assert.ok(existsSync(join(root, '.docs', name)), name);
  }
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, new RegExp(LOCAL_AGENTS_BEGIN));
  assert.ok(first.created.includes('AGENTS.md'));

  const second = ensureProjectDocs(root);
  assert.deepEqual(second.created, []);
  assert.deepEqual(second.updated, []);
  assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), agents);
});

test('scaffold preserves manual documentation and AGENTS content', (t) => {
  const root = temporaryRoot(t);
  mkdirSync(join(root, '.docs', 'features'), { recursive: true });
  writeFileSync(join(root, '.docs', 'project.md'), '# Manual project\n', 'utf8');
  writeFileSync(join(root, 'AGENTS.md'), '# Existing rules\n\nKeep this.\n', 'utf8');

  ensureProjectDocs(root);

  assert.equal(
    readFileSync(join(root, '.docs', 'project.md'), 'utf8'),
    '# Manual project\n',
  );
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Keep this\./);
  assert.match(agents, new RegExp(LOCAL_AGENTS_BEGIN));
});

test('scaffold refuses a conflicting .docs file without overwriting it', (t) => {
  const root = temporaryRoot(t);
  writeFileSync(join(root, '.docs'), 'do not replace', 'utf8');

  assert.throws(() => ensureProjectDocs(root), /not a directory/);
  assert.equal(readFileSync(join(root, '.docs'), 'utf8'), 'do not replace');
});

test('scaffold command-line entrypoint creates the standard tree', (t) => {
  const root = temporaryRoot(t);
  const script = fileURLToPath(new URL(
    '../config/skills/project-docs/scripts/scaffold.mjs',
    import.meta.url,
  ));
  const result = spawnSync(process.execPath, [script, root], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"created"/);
  assert.ok(existsSync(join(root, '.docs', 'features.md')));
});

test('registered plugin wrapper exposes the expected hooks', async (t) => {
  const root = temporaryRoot(t);
  const mock = mockClient();
  const hooks = await ProjectDocsPlugin({ client: mock.client, directory: root });
  t.after(() => hooks.dispose());

  assert.equal(typeof hooks.event, 'function');
  assert.equal(typeof hooks['chat.message'], 'function');
  assert.equal(typeof hooks['experimental.chat.system.transform'], 'function');
});

test('hook dispatches one GPT audit for a completed root response', async (t) => {
  const root = temporaryRoot(t);
  const mock = mockClient();
  mock.sessions.set('root', { id: 'root', directory: root });
  mock.messages.set('root', messagePair('assistant-1'));
  const hooks = createProjectDocsHooks(
    { client: mock.client, directory: root },
    { idleVerificationDelayMs: 1 },
  );
  t.after(() => hooks.dispose());

  await hooks.event({
    event: { type: 'session.created', properties: { info: mock.sessions.get('root') } },
  });
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: 'root' } },
  });
  await waitFor(() => mock.dispatches.length === 1, 'GPT audit was not dispatched');

  assert.equal(mock.dispatches[0].body.agent, PRIMARY_AGENT);
  assert.match(mock.dispatches[0].body.parts[0].text, /src\/example\.js/);
  assert.ok(existsSync(join(root, '.docs', 'features.md')));

  const childID = mock.dispatches[0].path.id;
  mock.messages.set(childID, messagePair('docs-success', 'audit', 'updated'));
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: childID } },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));

  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: 'root' } },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(mock.dispatches.length, 1, 'duplicate idle dispatched another audit');

  mock.sessions.set('other-child', {
    id: 'other-child',
    directory: root,
    parentID: 'root',
  });
  mock.messages.set('other-child', messagePair('other-child-response'));
  await hooks.event({
    event: {
      type: 'session.created',
      properties: { info: mock.sessions.get('other-child') },
    },
  });
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: 'other-child' } },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(mock.dispatches.length, 1, 'ordinary child session triggered an audit');
});

test('hook falls back from a late GPT error to Sonnet exactly once', async (t) => {
  const root = temporaryRoot(t);
  const mock = mockClient();
  mock.sessions.set('root', { id: 'root', directory: root });
  mock.messages.set('root', messagePair('assistant-2'));
  const hooks = createProjectDocsHooks(
    { client: mock.client, directory: root },
    { idleVerificationDelayMs: 1 },
  );
  t.after(() => hooks.dispose());

  await hooks.event({
    event: { type: 'session.created', properties: { info: mock.sessions.get('root') } },
  });
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: 'root' } },
  });
  await waitFor(() => mock.dispatches.length === 1, 'primary audit missing');
  const primaryID = mock.dispatches[0].path.id;

  await hooks.event({
    event: {
      type: 'session.error',
      properties: {
        sessionID: primaryID,
        error: { name: 'APIError', data: { message: 'primary failed' } },
      },
    },
  });
  await waitFor(() => mock.dispatches.length === 2, 'fallback audit missing');
  assert.deepEqual(
    mock.dispatches.map((entry) => entry.body.agent),
    [PRIMARY_AGENT, FALLBACK_AGENT],
  );

  const fallbackID = mock.dispatches[1].path.id;
  mock.messages.set(fallbackID, messagePair('docs-fallback-success'));
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: fallbackID } },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(mock.dispatches.length, 2);
});

test('hook coalesces queued responses and never overlaps writers', async (t) => {
  const root = temporaryRoot(t);
  const mock = mockClient();
  mock.sessions.set('root', { id: 'root', directory: root });
  mock.messages.set('root', messagePair('assistant-3'));
  const hooks = createProjectDocsHooks(
    { client: mock.client, directory: root },
    { idleVerificationDelayMs: 1 },
  );
  t.after(() => hooks.dispose());

  await hooks.event({
    event: { type: 'session.created', properties: { info: mock.sessions.get('root') } },
  });
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: 'root' } },
  });
  await waitFor(() => mock.dispatches.length === 1, 'first audit missing');

  mock.messages.set('root', messagePair('assistant-4', 'second', 'second done'));
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: 'root' } },
  });
  mock.messages.set('root', messagePair('assistant-5', 'third', 'third done'));
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: 'root' } },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(mock.dispatches.length, 1, 'queued responses overlapped the writer');

  const firstID = mock.dispatches[0].path.id;
  mock.messages.set(firstID, messagePair('docs-first-success'));
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: firstID } },
  });
  await waitFor(() => mock.dispatches.length === 2, 'coalesced audit missing');

  assert.match(
    mock.dispatches[1].body.parts[0].text,
    /Coalesced completed responses: 2/,
  );
  assert.match(mock.dispatches[1].body.parts[0].text, /third done/);
});

test('hook times out GPT, retries Sonnet, then reports final failure', async (t) => {
  const root = temporaryRoot(t);
  const mock = mockClient();
  mock.sessions.set('root', { id: 'root', directory: root });
  mock.messages.set('root', messagePair('assistant-6'));
  const hooks = createProjectDocsHooks(
    { client: mock.client, directory: root },
    { timeoutMs: 10, idleVerificationDelayMs: 1 },
  );
  t.after(() => hooks.dispose());

  await hooks.event({
    event: { type: 'session.created', properties: { info: mock.sessions.get('root') } },
  });
  await hooks.event({
    event: { type: 'session.idle', properties: { sessionID: 'root' } },
  });

  await waitFor(() => mock.dispatches.length === 2, 'timeout fallback missing');
  await waitFor(() => mock.toasts.some((toast) => toast.variant === 'error'), 'final failure toast missing');
  assert.deepEqual(
    mock.dispatches.map((entry) => entry.body.agent),
    [PRIMARY_AGENT, FALLBACK_AGENT],
  );
  assert.equal(mock.aborts.length, 2);
});
