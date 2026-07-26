import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  OPENROUTER_CHAT_URL,
  createOpenRouterPromptEnhancer,
  readOpenRouterApiKey,
} from '../config/lib/openrouter-prompt-enhancer.mjs';

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

test('OpenRouter prompt enhancer calls Qwen3.6 directly', async () => {
  const calls = [];
  const enhance = createOpenRouterPromptEnhancer({
    apiKey: 'test-key',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: 'Enhanced prompt.' } }],
        }),
      };
    },
  });

  const result = await enhance({
    payload: '{"current_prompt":"Improve this."}',
    policy: 'Enhance faithfully.',
    maxOutputTokens: 512,
  });

  assert.equal(result, 'Enhanced prompt.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, OPENROUTER_CHAT_URL);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, 'qwen/qwen3.6-35b-a3b:nitro');
  assert.equal(body.reasoning.effort, 'none');
  assert.equal(body.temperature, 0);
  assert.equal(body.top_p, 0.8);
  assert.equal(body.max_tokens, 512);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key');
  assert.ok(!config.enabled_providers.includes('openrouter'));
  assert.equal(config.provider.openrouter, undefined);
  assert.ok(!config.plugin.includes('./plugins/session-model-selector.mjs'));
});

test('OpenRouter credential is never embedded in the tracked config', () => {
  assert.doesNotMatch(configText, /sk-or-v1-/);
  assert.match(gitignore, /^config\/openrouter\.key$/m);
  assert.equal(keyExample, 'COLE_SUA_CHAVE_OPENROUTER_AQUI');
});

test('OpenRouter key file takes precedence over the environment fallback', () => {
  assert.equal(
    readOpenRouterApiKey({
      env: { OPENROUTER_API_KEY: 'environment-key' },
      readFile: () => ' file-key\r\n',
    }),
    'file-key',
  );
  assert.equal(
    readOpenRouterApiKey({
      env: { OPENROUTER_API_KEY: ' environment-key ' },
      readFile: () => {
        throw new Error('missing');
      },
    }),
    'environment-key',
  );
});

test('Plan uses GPT-OSS 20B through the isolated OpenRouter provider', () => {
  assert.ok(config.enabled_providers.includes('openrouter-oss'));
  assert.equal(
    config.agent.plan.model,
    'openrouter-oss/openai/gpt-oss-20b',
  );
  assert.equal(config.agent.plan.temperature, 0);
  assert.equal(
    config.provider['openrouter-oss'].options.apiKey,
    '{file:./openrouter.key}',
  );
  assert.equal(
    config.provider['openrouter-oss'].models['openai/gpt-oss-20b']
      .limit.context,
    131072,
  );
});
