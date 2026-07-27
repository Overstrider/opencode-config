import { createProjectDocsHooks } from '../skills/project-docs/scripts/hook-core.mjs';

export default async function ProjectDocsPlugin(context = {}) {
  return createProjectDocsHooks(context);
}
