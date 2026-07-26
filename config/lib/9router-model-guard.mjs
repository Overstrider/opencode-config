import { nineRouterAvailability } from './9router-availability.mjs';

export const FALLBACK_MODEL = {
  providerID: '9router-sol',
  modelID: 'cx/gpt-5.6-sol',
  variant: 'low',
};

export function create9RouterModelGuard(
  { client, directory = process.cwd() } = {},
  { availability = nineRouterAvailability } = {},
) {
  const notifiedSessions = new Set();

  async function isRootSession(sessionID) {
    try {
      const result = await client?.session?.get?.({
        path: { id: sessionID },
        query: { directory },
      });
      return result?.data && !result.data.parentID;
    } catch {
      return false;
    }
  }

  async function notify(sessionID, originalModel) {
    if (notifiedSessions.has(sessionID)) return;
    notifiedSessions.add(sessionID);
    console.warn(
      `[9router-model-guard] ${originalModel} unavailable; using ` +
      `${FALLBACK_MODEL.modelID}.`,
    );
    if (!await isRootSession(sessionID)) return;
    try {
      await client?.tui?.showToast?.({
        body: {
          title: '9Router fallback',
          message:
            `${originalModel} is rate-limited. Using GPT Sol Low immediately.`,
          variant: 'warning',
          duration: 6_000,
        },
        query: { directory },
      });
    } catch {}
  }

  return {
    'chat.message': async (input, output) => {
      const selected = output?.message?.model ?? input?.model;
      if (
        !selected ||
        selected.providerID !== '9router-claude' ||
        !selected.modelID
      ) {
        return;
      }

      const unavailable = await availability.modelUnavailable(
        'claude',
        selected.modelID,
      );
      if (unavailable !== true) return;

      output.message.model = { ...FALLBACK_MODEL };
      const sessionID = input?.sessionID ?? output.message.sessionID;
      if (sessionID) void notify(sessionID, selected.modelID);
    },

    event: async ({ event } = {}) => {
      if (event?.type !== 'session.deleted') return;
      const sessionID =
        event.properties?.info?.id ?? event.properties?.sessionID;
      if (sessionID) notifiedSessions.delete(sessionID);
    },
  };
}
