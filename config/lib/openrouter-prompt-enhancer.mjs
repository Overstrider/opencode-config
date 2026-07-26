export const OPENROUTER_ENHANCER_MODEL =
  'qwen/qwen3.6-35b-a3b:nitro';
export const OPENROUTER_CHAT_URL =
  'https://openrouter.ai/api/v1/chat/completions';

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
  apiKey = process.env.OPENROUTER_API_KEY,
  model = OPENROUTER_ENHANCER_MODEL,
  url = OPENROUTER_CHAT_URL,
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
        reasoning: {
          effort: 'none',
          exclude: true,
        },
        temperature: 0,
        top_p: 0.8,
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
