import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import SubagentVariantDefaultPlugin from '../config/plugins/subagent-variant-default.mjs';

const configText = readFileSync(
  new URL('../config/opencode.json', import.meta.url),
  'utf8',
);
const config = JSON.parse(configText);
const gitignore = readFileSync(
  new URL('../.gitignore', import.meta.url),
  'utf8',
);
const keyExample = readFileSync(
  new URL('../config/openrouter.key.example', import.meta.url),
  'utf8',
).trim();

test('OpenRouter credential is never embedded in the tracked config', () => {
  assert.doesNotMatch(configText, /sk-or-v1-/);
  assert.match(gitignore, /^config\/openrouter\.key$/m);
  assert.equal(keyExample, 'COLE_SUA_CHAVE_OPENROUTER_AQUI');
});

test('Plan uses GPT Sol High through Merlin 9router', () => {
  assert.equal(
    config.agent.plan.model,
    '9router-sol/cx/gpt-5.6-sol',
  );
  assert.equal(config.agent.plan.variant, 'high');
});

test('all enabled model providers use Merlin only', () => {
  for (const providerID of config.enabled_providers) {
    const provider = config.provider[providerID];
    assert.equal(new URL(provider.options.baseURL).host, 'merlin.loldinis.com');
    assert.equal(provider.options.apiKey, '{file:./9router-merlin.key}');
  }
  assert.ok(!config.plugin.includes('./plugins/9router-autostart.mjs'));
  assert.ok(!config.plugin.includes('./plugins/9router-model-guard.mjs'));
});

test('Sakana Fugu uses supported Responses reasoning variants', () => {
  const provider = config.provider['9router-sakana'];
  assert.equal(provider.npm, '@ai-sdk/openai');
  assert.deepEqual(Object.keys(provider.models), [
    'sakana/fugu',
    'sakana/fugu-ultra',
    'sakana/fugu-ultra-v1.1',
  ]);
  assert.deepEqual(Object.keys(provider.models['sakana/fugu'].variants), [
    'high',
    'xhigh',
  ]);
  assert.deepEqual(Object.keys(provider.models['sakana/fugu-ultra'].variants), [
    'high',
    'xhigh',
    'max',
  ]);
  assert.doesNotMatch(JSON.stringify(provider), /temperature/i);
});

test('inherited max uses the model lowest variant', async () => {
  const hooks = await SubagentVariantDefaultPlugin({
    directory: 'C:\\workspace',
    client: {
      session: {
        get: async ({ path }) => ({
          data: path.id === 'child'
            ? { id: 'child', parentID: 'root' }
            : { id: 'root' },
        }),
      },
    },
  });
  hooks.config(config);

  const sol = {
    message: {
      model: {
        providerID: '9router-sol',
        modelID: 'cx/gpt-5.6-sol',
        variant: 'max',
      },
    },
  };
  await hooks['chat.message']({ sessionID: 'child' }, sol);
  assert.equal(sol.message.model.variant, 'low');

  const fugu = {
    message: {
      model: {
        providerID: '9router-sakana',
        modelID: 'sakana/fugu',
        variant: 'max',
      },
    },
  };
  await hooks['chat.message']({ sessionID: 'child' }, fugu);
  assert.equal(fugu.message.model.variant, 'high');

  const root = structuredClone(sol);
  root.message.model.variant = 'max';
  await hooks['chat.message']({ sessionID: 'root' }, root);
  assert.equal(root.message.model.variant, 'max');
});
