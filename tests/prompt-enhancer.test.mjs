import assert from 'node:assert/strict';
import test from 'node:test';

import PromptEnhancerPlugin from '../config/plugins/prompt-enhancer-hook.mjs';
import {
  METADATA_KEY,
  PRIMARY_AGENT,
  createPromptEnhancerHooks,
  protectPrompt,
  validateAndRestore,
} from '../config/skills/prompt-enhancer/scripts/hook-core.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function mockClient(responder) {
  const sessions = new Map([
    ['root', { id: 'root', directory: 'C:\\workspace' }],
    ['child', { id: 'child', parentID: 'root', directory: 'C:\\workspace' }],
  ]);
  const prompts = [];
  const creates = [];
  const deletes = [];
  const aborts = [];
  const toasts = [];
  let sequence = 0;

  return {
    sessions,
    prompts,
    creates,
    deletes,
    aborts,
    toasts,
    client: {
      session: {
        get: async ({ path }) => ({ data: sessions.get(path.id) }),
        create: async ({ body, query }) => {
          sequence += 1;
          const session = {
            id: `enhancer-${sequence}`,
            parentID: body.parentID,
            directory: query.directory,
            title: body.title,
          };
          sessions.set(session.id, session);
          creates.push(session);
          return { data: session };
        },
        prompt: async (args) => {
          prompts.push(args);
          if (responder) return responder(args);
          const payload = JSON.parse(args.body.parts[0].text);
          return {
            data: {
              info: {
                structured: {
                  enhanced_prompt:
                    `Complete this request: ${payload.current_prompt}\n` +
                    'Respond in the source language.',
                },
              },
            },
          };
        },
        abort: async ({ path }) => {
          aborts.push(path.id);
          return { data: true };
        },
        delete: async ({ path }) => {
          deletes.push(path.id);
          sessions.delete(path.id);
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

function userOutput(text, extraParts = []) {
  return {
    message: { role: 'user', sessionID: 'root' },
    parts: [{ type: 'text', text }, ...extraParts],
  };
}

function modelMessages(parts) {
  return {
    messages: [{
      info: { role: 'user', sessionID: 'root' },
      parts: structuredClone(parts),
    }],
  };
}

test('protected literals round-trip exactly and invalid outputs are rejected', () => {
  const source =
    'Edite `src/app.ts` com --mode=fast em https://example.com e mantenha 15s.';
  const protection = protectPrompt(source);

  assert.notEqual(protection.masked, source);
  assert.doesNotMatch(protection.masked, /src\/app\.ts|example\.com|15s/);
  const restored = validateAndRestore(
    `Implement carefully: ${protection.masked}`,
    protection,
    source.length,
  );
  assert.match(restored, /`src\/app\.ts`/);
  assert.match(restored, /--mode=fast/);
  assert.match(restored, /https:\/\/example\.com/);
  assert.match(restored, /15s/);

  const missing = protection.masked.replace(
    protection.protectedValues[0].token,
    '',
  );
  assert.throws(
    () => validateAndRestore(missing, protection, source.length),
    /exactly once/,
  );
});

test('plugin wrapper exposes initial and model-facing hooks', async () => {
  const mock = mockClient();
  const requests = [];
  const hooks = await PromptEnhancerPlugin({
    client: mock.client,
    directory: 'C:\\workspace',
    fetch: async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          choices: [{
            message: {
              content: 'Improve this prompt. Respond in Portuguese.',
            },
          }],
        }),
      };
    },
  });

  assert.equal(typeof hooks['chat.message'], 'function');
  assert.equal(typeof hooks['command.execute.before'], 'function');
  assert.equal(typeof hooks['experimental.chat.messages.transform'], 'function');
  assert.equal(typeof hooks['experimental.chat.system.transform'], 'function');

  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('Melhore este prompt.'),
  );
  assert.deepEqual(
    requests.map(({ init }) => JSON.parse(init.body).model),
    ['qwen/qwen3.6-35b-a3b:nitro'],
  );
  assert.equal(mock.creates.length, 0);
  assert.equal(mock.prompts.length, 0);
  await hooks.dispose();
});

test('root prompt stays visible while only model-facing text becomes English', async () => {
  const mock = mockClient();
  const hooks = createPromptEnhancerHooks({
    client: mock.client,
    directory: 'C:\\workspace',
  });
  const original =
    'Corrija `src/login.ts` sem mudar a API. Responda em português.';
  const output = userOutput(original, [{
    type: 'file',
    filename: 'erro.png',
    mime: 'image/png',
    url: 'file:///secret/path/erro.png',
  }]);

  await hooks['chat.message']({ sessionID: 'root' }, output);

  assert.equal(output.parts[0].text, original);
  const metadata = output.parts[0].metadata[METADATA_KEY];
  assert.equal(metadata.agent, PRIMARY_AGENT);
  assert.match(metadata.modelText, /^Complete this request:/);
  assert.match(metadata.modelText, /`src\/login\.ts`/);
  assert.equal(mock.prompts.length, 1);
  const payload = JSON.parse(mock.prompts[0].body.parts[0].text);
  assert.deepEqual(payload.attachments, [{
    filename: 'erro.png',
    mime: 'image/png',
  }]);
  assert.doesNotMatch(mock.prompts[0].body.parts[0].text, /secret\/path/);
  assert.equal(mock.prompts[0].body.agent, PRIMARY_AGENT);
  assert.equal(mock.deletes.length, 1);

  const transformed = modelMessages(output.parts);
  await hooks['experimental.chat.messages.transform']({}, transformed);
  assert.equal(transformed.messages[0].parts[0].text, metadata.modelText);
  assert.equal(transformed.messages[0].parts[1].type, 'file');
  assert.equal(output.parts[0].text, original);
  await hooks.dispose();
});

test('configured agent list invokes only one enhancer agent', async () => {
  const mock = mockClient();
  const hooks = createPromptEnhancerHooks(
    {
      client: mock.client,
      directory: 'C:\\workspace',
    },
    {
      agentsForSession: async () => [PRIMARY_AGENT],
      agentAvailable: async () => true,
    },
  );
  const output = userOutput('Melhore este prompt.');

  await hooks['chat.message']({ sessionID: 'root' }, output);

  assert.equal(mock.prompts.length, 1);
  assert.equal(mock.prompts[0].body.agent, PRIMARY_AGENT);
  await hooks.dispose();
});

test('multiple human text parts are combined once and extras are model-ignored', async () => {
  const mock = mockClient();
  const hooks = createPromptEnhancerHooks({
    client: mock.client,
    directory: 'C:\\workspace',
  });
  const output = userOutput('Primeira parte.', [
    { type: 'text', text: 'Segunda parte.' },
    { type: 'text', text: 'Synthetic context.', synthetic: true },
  ]);

  await hooks['chat.message']({ sessionID: 'root' }, output);
  const payload = JSON.parse(mock.prompts[0].body.parts[0].text);
  assert.match(payload.current_prompt, /Primeira parte\.\n\nSegunda parte\./);

  const transformed = modelMessages(output.parts);
  await hooks['experimental.chat.messages.transform']({}, transformed);
  assert.equal(transformed.messages[0].parts[1].ignored, true);
  assert.equal(transformed.messages[0].parts[2].text, 'Synthetic context.');
  assert.equal(transformed.messages[0].parts[2].ignored, undefined);
  await hooks.dispose();
});

test('!raw preserves visible text, removes marker model-side, and calls no model', async () => {
  const mock = mockClient();
  const hooks = createPromptEnhancerHooks({
    client: mock.client,
    directory: 'C:\\workspace',
  });
  const output = userOutput('!raw\nExecute exatamente `echo oi`.');

  await hooks['chat.message']({ sessionID: 'root' }, output);

  assert.equal(output.parts[0].text, '!raw\nExecute exatamente `echo oi`.');
  assert.equal(mock.prompts.length, 0);
  assert.equal(
    output.parts[0].metadata[METADATA_KEY].modelText,
    'Execute exatamente `echo oi`.',
  );
  const transformed = modelMessages(output.parts);
  await hooks['experimental.chat.messages.transform']({}, transformed);
  assert.equal(transformed.messages[0].parts[0].text, 'Execute exatamente `echo oi`.');
  await hooks.dispose();
});

test('commands, child sessions, synthetic text, and image-only input are skipped', async () => {
  const mock = mockClient();
  const hooks = createPromptEnhancerHooks({
    client: mock.client,
    directory: 'C:\\workspace',
  });
  const command = userOutput('Generated by command.');
  await hooks['command.execute.before'](
    { command: 'test', sessionID: 'root', arguments: '' },
    command,
  );
  await hooks['chat.message']({ sessionID: 'root' }, command);
  assert.equal(command.parts[0].metadata[METADATA_KEY].bypass, 'command');

  await hooks['chat.message'](
    { sessionID: 'child' },
    userOutput('Child prompt.'),
  );
  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('', [{ type: 'text', text: 'Synthetic.', synthetic: true }]),
  );
  await hooks['chat.message'](
    { sessionID: 'root' },
    { message: { role: 'user' }, parts: [{ type: 'file', mime: 'image/png' }] },
  );
  assert.equal(mock.prompts.length, 0);
  await hooks.dispose();
});

test('invalid output fails open without trying a second model', async () => {
  const mock = mockClient(async (args) => {
    return {
      data: {
        info: {
          structured: {
            enhanced_prompt: 'Dropped every protected literal.',
          },
        },
      },
    };
  });
  const hooks = createPromptEnhancerHooks({
    client: mock.client,
    directory: 'C:\\workspace',
  });
  const output = userOutput('Mantenha `EXACT_VALUE` e melhore o pedido.');

  await hooks['chat.message']({ sessionID: 'root' }, output);

  assert.deepEqual(mock.prompts.map((entry) => entry.body.agent), [PRIMARY_AGENT]);
  assert.equal(output.parts[0].metadata, undefined);
  assert.equal(mock.deletes.length, 1);
  await hooks.dispose();
});

test('credit failure opens a long breaker and skips the route immediately', async () => {
  let clock = 1_000;
  const mock = mockClient(async () => {
    return {
      error: {
        statusCode: 402,
        data: { message: 'credit balance exhausted' },
      },
    };
  });
  const hooks = createPromptEnhancerHooks(
    { client: mock.client, directory: 'C:\\workspace' },
    {
      cooldownMs: 60,
      maxCooldownMs: 240,
      hardCooldownMs: 900,
      hardMaxCooldownMs: 3_600,
      now: () => clock,
    },
  );

  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('Primeira tentativa.'),
  );
  assert.deepEqual(
    mock.prompts.map((entry) => entry.body.agent),
    [PRIMARY_AGENT],
  );

  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('Ambos ainda bloqueados.'),
  );
  assert.equal(mock.prompts.length, 1);

  clock += 61;
  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('A rota ainda está em cooldown longo.'),
  );
  assert.equal(mock.prompts.length, 1);
  await hooks.dispose();
});

test('timeout fails open, warns once, and opens a cooldown circuit', async () => {
  let clock = 1_000;
  const mock = mockClient(() => new Promise(() => {}));
  const hooks = createPromptEnhancerHooks(
    { client: mock.client, directory: 'C:\\workspace' },
    { timeoutMs: 5, cooldownMs: 60, now: () => clock },
  );
  const first = userOutput('Primeiro prompt.');

  await hooks['chat.message']({ sessionID: 'root' }, first);

  assert.equal(first.parts[0].metadata, undefined);
  assert.equal(mock.prompts.length, 1);
  assert.equal(mock.aborts.length, 1);
  assert.equal(mock.deletes.length, 1);
  assert.equal(mock.toasts.length, 1);

  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('Durante cooldown.'),
  );
  assert.equal(mock.prompts.length, 1);
  assert.equal(mock.toasts.length, 1);

  clock += 61;
  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('Depois do cooldown.'),
  );
  assert.equal(mock.prompts.length, 2);
  assert.equal(mock.toasts.length, 2);
  await hooks.dispose();
});

test('direct transport aborts without creating an OpenCode session', async () => {
  const mock = mockClient();
  let aborted = false;
  const hooks = createPromptEnhancerHooks(
    { client: mock.client, directory: 'C:\\workspace' },
    {
      timeoutMs: 5,
      enhanceRequest: ({ signal }) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      }),
    },
  );

  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('Use o original se a rede travar.'),
  );

  assert.equal(aborted, true);
  assert.equal(mock.creates.length, 0);
  assert.equal(mock.prompts.length, 0);
  assert.equal(mock.aborts.length, 0);
  assert.equal(mock.deletes.length, 0);
  await hooks.dispose();
});

test('known unavailable route is skipped without creating a session', async () => {
  const mock = mockClient();
  const hooks = createPromptEnhancerHooks(
    { client: mock.client, directory: 'C:\\workspace' },
    { agentAvailable: async () => false },
  );

  await hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('Use o original.'),
  );

  assert.equal(mock.prompts.length, 0);
  await hooks.dispose();
});

test('plain text response is accepted when structured metadata is absent', async () => {
  const mock = mockClient(() => ({
    data: {
      info: {},
      parts: [{
        type: 'text',
        text: 'Improve this request clearly. Respond in Portuguese.',
      }],
    },
  }));
  const hooks = createPromptEnhancerHooks(
    { client: mock.client, directory: 'C:\\workspace' },
  );
  const output = userOutput('Melhore este pedido.');

  await hooks['chat.message']({ sessionID: 'root' }, output);

  assert.equal(
    output.parts[0].metadata[METADATA_KEY].modelText,
    'Improve this request clearly. Respond in Portuguese.',
  );
  assert.equal(output.parts[0].metadata[METADATA_KEY].agent, PRIMARY_AGENT);
  await hooks.dispose();
});

test('internal enhancer calls receive an isolated system and bounded output', async () => {
  const gate = deferred();
  const mock = mockClient(() => gate.promise);
  const hooks = createPromptEnhancerHooks(
    { client: mock.client, directory: 'C:\\workspace' },
    { timeoutMs: 2_000 },
  );
  const pending = hooks['chat.message'](
    { sessionID: 'root' },
    userOutput('Melhore isto.'),
  );

  while (mock.creates.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  const childID = mock.creates[0].id;
  const system = { system: ['global instructions', 'project history'] };
  await hooks['experimental.chat.system.transform'](
    { sessionID: childID },
    system,
  );
  assert.equal(system.system.length, 1);
  assert.match(system.system[0], /PROMPT_ENHANCER_POLICY_V1/);
  assert.doesNotMatch(system.system.join('\n'), /global instructions/);

  const params = { maxOutputTokens: 99_999 };
  await hooks['chat.params']({ sessionID: childID }, params);
  assert.equal(params.maxOutputTokens, 8_192);
  assert.equal(mock.prompts[0].body.format, undefined);

  const payload = JSON.parse(mock.prompts[0].body.parts[0].text);
  gate.resolve({
    data: {
      info: {
        structured: {
          enhanced_prompt: `Improve this request: ${payload.current_prompt}`,
        },
      },
    },
  });
  await pending;
  await hooks.dispose();
});

test('oversized prompts fail open without invoking an enhancer', async () => {
  const mock = mockClient();
  const hooks = createPromptEnhancerHooks(
    { client: mock.client, directory: 'C:\\workspace' },
    { maxPromptChars: 5 },
  );
  const output = userOutput('123456');

  await hooks['chat.message']({ sessionID: 'root' }, output);

  assert.equal(mock.prompts.length, 0);
  assert.equal(output.parts[0].metadata, undefined);
  await hooks.dispose();
});
