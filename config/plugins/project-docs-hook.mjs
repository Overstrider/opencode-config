import { nineRouterAvailability } from '../lib/9router-availability.mjs';
import { createProjectDocsHooks } from '../skills/project-docs/scripts/hook-core.mjs';

export default async function ProjectDocsPlugin(context = {}) {
  return createProjectDocsHooks(context, {
    fallbackAvailable: async () =>
      await nineRouterAvailability.modelUnavailable(
        'claude',
        'claude-sonnet-5',
      ) === false,
  });
}
