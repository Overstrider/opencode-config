import assert from 'node:assert/strict';
import test from 'node:test';

import {
  create9RouterAvailability,
} from '../config/lib/9router-availability.mjs';
import {
  FALLBACK_MODEL,
  create9RouterModelGuard,
} from '../config/lib/9router-model-guard.mjs';
import * as modelGuardPlugin from '../config/plugins/9router-model-guard.mjs';

test('OpenCode model guard plugin exposes only its default plugin function', () => {
  assert.deepEqual(Object.keys(modelGuardPlugin), ['default']);
  assert.equal(typeof modelGuardPlugin.default, 'function');
});

test('9router availability uses local CLI auth and detects provider locks', async () => {
  const reads = new Map([
    ['C:\\data\\9router\\machine-id', 'machine'],
    ['C:\\data\\9router\\auth\\cli-secret', 'secret'],
  ]);
  let request;
  const availability = create9RouterAvailability({
    platform: 'win32',
    appData: 'C:\\data',
    readFile: (path) => reads.get(path),
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          models: [{
            provider: 'claude',
            model: '__all',
            status: 'unavailable',
          }],
        }),
      };
    },
  });

  assert.equal(
    await availability.modelUnavailable('claude', 'cc/claude-opus-5'),
    true,
  );
  assert.equal(request.url, 'http://127.0.0.1:20128/api/models/availability');
  assert.match(request.options.headers['x-9r-cli-token'], /^[a-f0-9]{16}$/);
});

test('availability failure is unknown, not falsely available', async () => {
  const availability = create9RouterAvailability({
    readFile: () => {
      throw new Error('missing');
    },
  });
  assert.equal(
    await availability.modelUnavailable('claude', 'claude-sonnet-5'),
    undefined,
  );
});

test('model guard replaces a known-unavailable Claude model before dispatch', async () => {
  const toasts = [];
  const hooks = create9RouterModelGuard(
    {
      directory: 'C:\\workspace',
      client: {
        session: {
          get: async () => ({ data: { id: 'root' } }),
        },
        tui: {
          showToast: async ({ body }) => {
            toasts.push(body);
          },
        },
      },
    },
    {
      availability: {
        modelUnavailable: async () => true,
      },
    },
  );
  const output = {
    message: {
      sessionID: 'root',
      model: {
        providerID: '9router-claude',
        modelID: 'cc/claude-opus-5',
        variant: 'low',
      },
    },
  };

  await hooks['chat.message']({ sessionID: 'root' }, output);
  assert.deepEqual(output.message.model, FALLBACK_MODEL);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(toasts.length, 1);
});

test('model guard preserves Claude when 9router reports it available', async () => {
  const hooks = create9RouterModelGuard(
    {},
    {
      availability: {
        modelUnavailable: async () => false,
      },
    },
  );
  const model = {
    providerID: '9router-claude',
    modelID: 'cc/claude-opus-5',
    variant: 'low',
  };
  const output = { message: { sessionID: 'root', model: { ...model } } };

  await hooks['chat.message']({ sessionID: 'root' }, output);
  assert.deepEqual(output.message.model, model);
});
