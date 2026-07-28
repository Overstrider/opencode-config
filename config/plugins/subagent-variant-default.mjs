const VARIANT_ORDER = ['low', 'medium', 'high', 'xhigh', 'max'];

export default async function SubagentVariantDefaultPlugin({
  client,
  directory = process.cwd(),
} = {}) {
  const lowestVariants = new Map();

  return {
    config: (config) => {
      lowestVariants.clear();
      for (const [providerID, provider] of Object.entries(config.provider ?? {})) {
        for (const [modelID, model] of Object.entries(provider.models ?? {})) {
          const variants = Object.keys(model.variants ?? {});
          const lowest = VARIANT_ORDER.find((variant) => variants.includes(variant));
          if (lowest) lowestVariants.set(`${providerID}/${modelID}`, lowest);
        }
      }
    },

    'chat.message': async (input, output) => {
      const model = output?.message?.model ?? input?.model;
      const sessionID = input?.sessionID ?? output?.message?.sessionID;
      if (!output?.message || !sessionID || model?.variant !== 'max') return;

      try {
        const session = await client?.session?.get?.({
          path: { id: sessionID },
          query: { directory },
        });
        if (!session?.data?.parentID) return;
      } catch {
        return;
      }

      const variant = lowestVariants.get(
        `${model.providerID}/${model.modelID}`,
      ) ?? 'low';
      output.message.model = { ...model, variant };
    },
  };
}
