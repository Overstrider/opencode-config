import {
  createOpenRouterPromptEnhancer,
} from '../lib/openrouter-prompt-enhancer.mjs';
import { createPromptEnhancerHooks } from '../skills/prompt-enhancer/scripts/hook-core.mjs';

const OPENROUTER_ENHANCER_AGENT = 'prompt-enhancer-openrouter';

export default async function PromptEnhancerPlugin(context = {}) {
  const enhanceRequest = createOpenRouterPromptEnhancer({
    fetchImpl: context.fetch ?? globalThis.fetch,
  });

  return createPromptEnhancerHooks(context, {
    timeoutMs: 5_000,
    enhanceRequest,
    agentsForSession: async () => [OPENROUTER_ENHANCER_AGENT],
    agentAvailable: async () => true,
  });
}
