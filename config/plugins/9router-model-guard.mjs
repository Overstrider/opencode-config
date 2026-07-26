import { create9RouterModelGuard } from '../lib/9router-model-guard.mjs';

export default async function NineRouterModelGuardPlugin(context = {}) {
  return create9RouterModelGuard(context);
}
