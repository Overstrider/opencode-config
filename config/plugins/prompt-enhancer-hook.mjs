import { readFileSync } from 'node:fs';
import {
  createOpenRouterPromptEnhancer,
} from '../lib/openrouter-prompt-enhancer.mjs';
import { createPromptEnhancerHooks } from '../skills/prompt-enhancer/scripts/hook-core.mjs';

const NINEROUTER_ENHANCER_AGENT = 'prompt-enhancer-9router-merlin';
const NINEROUTER_MERLIN_URL = 'https://merlin.loldinis.com/v1/chat/completions';
const NINEROUTER_MERLIN_MODEL = 'openrouter/openai/gpt-oss-20b';
const NINEROUTER_MERLIN_KEY_URL = new URL('../9router-merlin.key', import.meta.url);

function readNineRouterMerlinApiKey({
  env = process.env,
  readFile = readFileSync,
  keyURL = NINEROUTER_MERLIN_KEY_URL,
} = {}) {
  try {
    const fileKey = readFile(keyURL, 'utf8').trim();
    if (fileKey) return fileKey;
  } catch {}
  return env.NINEROUTER_MERLIN_API_KEY?.trim() || '';
}

export default async function PromptEnhancerPlugin(context = {}) {
  const enhanceRequest = createOpenRouterPromptEnhancer({
    fetchImpl: context.fetch ?? globalThis.fetch,
    apiKey: readNineRouterMerlinApiKey(),
    model: NINEROUTER_MERLIN_MODEL,
    url: NINEROUTER_MERLIN_URL,
    // "Use 9router's default settings": don't force sampling params — let
    // the merlin.loldinis.com 9router / gpt-oss-20b defaults apply.
    // Exception: `reasoning` cannot be omitted — OpenRouter's gpt-oss-20b
    // endpoint 400s with "Reasoning is mandatory... cannot be disabled" if
    // it's missing. `medium` is the least prescriptive value that satisfies it.
    temperature: undefined,
    topP: undefined,
    reasoning: { effort: 'medium' },
  });

  return createPromptEnhancerHooks(context, {
    // gpt-oss-20b via 9router→OpenRouter is a reasoning model with an extra
    // network hop vs. the old direct-OpenRouter :nitro route — observed
    // 1.7–4.2s round trips. 5s (tuned for :nitro) was flaking; give headroom.
    timeoutMs: 12_000,
    enhanceRequest,
    agentsForSession: async () => [NINEROUTER_ENHANCER_AGENT],
    agentAvailable: async () => true,
  });
}
