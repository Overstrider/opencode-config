import { readFileSync } from 'node:fs';

export const OPENROUTER_ENHANCER_MODEL =
  'qwen/qwen3.6-35b-a3b:nitro';
export const OPENROUTER_CHAT_URL =
  'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_KEY_URL =
  new URL('../openrouter.key', import.meta.url);

export function readOpenRouterApiKey({
  env = process.env,
  readFile = readFileSync,
  keyURL = OPENROUTER_KEY_URL,
} = {}) {
  try {
    const fileKey = readFile(keyURL, 'utf8').trim();
    if (fileKey) return fileKey;
  } catch {}
  return env.OPENROUTER_API_KEY?.trim() || '';
}

class OpenRouterRequestError extends Error {
  constructor(message, { status, headers, data } = {}) {
    super(message);
    this.name = 'OpenRouterRequestError';
    this.status = status;
    this.headers = headers;
    this.data = data;
  }
}

function responseText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  throw new OpenRouterRequestError(
    'OpenRouter returned no prompt enhancement',
    { data },
  );
}

export function createOpenRouterPromptEnhancer({
  fetchImpl = globalThis.fetch,
  apiKey = readOpenRouterApiKey(),
  model = OPENROUTER_ENHANCER_MODEL,
  url = OPENROUTER_CHAT_URL,
  // Deterministic-rewrite defaults for the direct-OpenRouter route. Pass
  // `undefined` for any of these (e.g. when routing through 9router) to omit
  // the field entirely and defer to that backend's own model defaults.
  temperature = 0,
  topP = 0.8,
  reasoning = { effort: 'none', exclude: true },
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('A fetch implementation is required');
  }

  return async function enhance({
    payload,
    policy,
    signal,
    maxOutputTokens,
  }) {
    if (!apiKey?.trim()) {
      throw new OpenRouterRequestError(
        'OPENROUTER_API_KEY is not configured',
        { status: 401 },
      );
    }

    const response = await fetchImpl(url, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'OpenCode Prompt Enhancer',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: policy },
          { role: 'user', content: payload },
        ],
        // Explicit: some backends (9router) default a missing `stream` to
        // true and SSE-encode the body, which breaks a plain response.json().
        stream: false,
        ...(reasoning !== undefined ? { reasoning } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        ...(topP !== undefined ? { top_p: topP } : {}),
        max_tokens: maxOutputTokens,
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }

    if (!response.ok) {
      const message =
        data?.error?.message ??
        data?.message ??
        `OpenRouter request failed with HTTP ${response.status}`;
      throw new OpenRouterRequestError(message, {
        status: response.status,
        headers: response.headers,
        data,
      });
    }

    return responseText(data);
  };
}
