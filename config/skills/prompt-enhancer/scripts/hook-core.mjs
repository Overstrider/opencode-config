import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export const PRIMARY_AGENT = 'prompt-enhancer-openrouter';
export const METADATA_KEY = 'promptEnhancer';
export const METADATA_VERSION = 1;
export const ATTEMPT_TIMEOUT_MS = 8_000;
export const TRANSIENT_COOLDOWN_MS = 60_000;
export const TRANSIENT_MAX_COOLDOWN_MS = 15 * 60_000;
export const HARD_COOLDOWN_MS = 15 * 60_000;
export const HARD_MAX_COOLDOWN_MS = 6 * 60 * 60_000;
export const MAX_PROMPT_CHARS = 120_000;
export const MAX_OUTPUT_TOKENS = 8_192;

const POLICY = readFileSync(
  new URL('../references/enhancer-policy.md', import.meta.url),
  'utf8',
).trim();
class AttemptTimeoutError extends Error {
  constructor(agent, timeoutMs) {
    super(`${agent} timed out after ${timeoutMs}ms`);
    this.name = 'AttemptTimeoutError';
  }
}

function dataOf(result) {
  return result?.data ?? undefined;
}

function errorOf(result) {
  return result?.error ?? undefined;
}

function errorMessage(error) {
  if (!error) return 'unknown error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error?.data?.message === 'string') return error.data.message;
  if (typeof error?.message === 'string') return error.message;
  if (typeof error?.name === 'string') return error.name;
  return 'unknown error';
}

function errorStatus(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.data?.status,
    error?.data?.statusCode,
    error?.response?.status,
  ];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) {
      return parsed;
    }
  }
  return undefined;
}

function errorFingerprint(error) {
  return [
    errorMessage(error),
    error?.name,
    error?.code,
    error?.data?.code,
    error?.data?.type,
  ]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

function retryAfterMs(error, currentTime) {
  const direct = [
    error?.retryAfter,
    error?.retry_after,
    error?.data?.retryAfter,
    error?.data?.retry_after,
  ];
  const headers = error?.headers ?? error?.response?.headers;
  if (headers) {
    direct.push(
      typeof headers.get === 'function'
        ? headers.get('retry-after')
        : headers['retry-after'] ?? headers['Retry-After'],
    );
  }

  for (const value of direct) {
    if (value === undefined || value === null || value === '') continue;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.ceil(seconds * 1_000);
    }
    const date = Date.parse(String(value));
    if (Number.isFinite(date)) return Math.max(0, date - currentTime);
  }
  return 0;
}

function failureKind(error) {
  const status = errorStatus(error);
  const fingerprint = errorFingerprint(error);
  if (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    /\b(?:insufficient[_ -]?quota|credit|credits|billing|payment|balance|subscription|no funds|saldo|cr[eé]dito)\b/.test(
      fingerprint,
    )
  ) {
    return 'hard';
  }
  return 'transient';
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function countOccurrences(value, token) {
  let count = 0;
  let offset = 0;
  while (offset <= value.length) {
    const found = value.indexOf(token, offset);
    if (found < 0) break;
    count += 1;
    offset = found + token.length;
  }
  return count;
}

function collectRanges(value) {
  const ranges = [];
  const patterns = [
    /```[\s\S]*?```|~~~[\s\S]*?~~~/g,
    /`[^`\r\n]+`/g,
    /\bhttps?:\/\/[^\s<>"')\]]+/g,
    /\b[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*/g,
    /(?:^|(?<=\s))(?:\.{0,2}\/|\/)[A-Za-z0-9_.,@%+~#=-]+(?:\/[A-Za-z0-9_.,@%+~#=-]+)+/gm,
    /\$\{[^}\r\n]+\}|\{\{[^}\r\n]+\}\}|<%[\s\S]*?%>/g,
    /(?:^|(?<=\s))--?[A-Za-z0-9][A-Za-z0-9_-]*(?:=[^\s]+)?/gm,
    /@[A-Za-z0-9_.\/\\-]+/g,
    /(["'])(?:\\.|(?!\1)[^\\\r\n])*\1/g,
    /\b(?:v?\d+(?:\.\d+){1,4}(?:[-+][A-Za-z0-9.-]+)?|\d+(?:\.\d+)?(?:ms|s|m|h|d|px|%|kb|mb|gb|tb)?|#\d+)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      if (match.index === undefined || !match[0]) continue;
      const leading = match[0].match(/^\s/) ? 1 : 0;
      ranges.push({
        start: match.index + leading,
        end: match.index + match[0].length,
      });
    }
  }

  ranges.sort((left, right) =>
    left.start - right.start || right.end - left.end,
  );
  const accepted = [];
  for (const range of ranges) {
    const previous = accepted.at(-1);
    if (previous && range.start < previous.end) continue;
    accepted.push(range);
  }
  return accepted;
}

export function protectPrompt(value) {
  const hash = digest(value).slice(0, 10).toUpperCase();
  let prefix = `[[PE_${hash}_`;
  while (value.includes(prefix)) prefix = `${prefix}X`;

  const protectedValues = [];
  const pieces = [];
  let cursor = 0;
  for (const range of collectRanges(value)) {
    pieces.push(value.slice(cursor, range.start));
    const token = `${prefix}${protectedValues.length}]]`;
    const original = value.slice(range.start, range.end);
    protectedValues.push({ token, original });
    pieces.push(token);
    cursor = range.end;
  }
  pieces.push(value.slice(cursor));
  return {
    masked: pieces.join(''),
    protectedValues,
  };
}

export function validateAndRestore(maskedOutput, protection, sourceLength) {
  if (typeof maskedOutput !== 'string' || !maskedOutput.trim()) {
    throw new Error('enhancer returned an empty prompt');
  }
  const maximum = Math.max(
    1_000,
    sourceLength + 2_000,
    Math.ceil(sourceLength * 2.5),
  );
  if (maskedOutput.length > maximum) {
    throw new Error(`enhancer output exceeded ${maximum} characters`);
  }

  const expected = new Set(
    protection.protectedValues.map((entry) => entry.token),
  );
  const prefix = protection.protectedValues[0]?.token.replace(/\d+\]\]$/, '');
  if (prefix) {
    const found = maskedOutput.match(/\[\[PE_[A-Z0-9_]+\d+\]\]/g) || [];
    for (const token of found) {
      if (!expected.has(token)) {
        throw new Error(`enhancer introduced unknown protected token ${token}`);
      }
    }
  }

  let restored = maskedOutput;
  for (const entry of protection.protectedValues) {
    if (countOccurrences(restored, entry.token) !== 1) {
      throw new Error(`enhancer did not preserve ${entry.token} exactly once`);
    }
    restored = restored.replace(entry.token, entry.original);
  }
  return restored.trim();
}

function visibleTextParts(parts) {
  return (Array.isArray(parts) ? parts : []).filter((part) =>
    part?.type === 'text' &&
    typeof part.text === 'string' &&
    part.text.length > 0 &&
    !part.synthetic &&
    !part.ignored);
}

function rawRemainder(value) {
  if (!value.startsWith('!raw')) return undefined;
  if (value.length === 4) return '';
  const next = value[4];
  if (!/\s/.test(next)) return undefined;
  if (next === '\r' && value[5] === '\n') return value.slice(6);
  return value.slice(5);
}

function setMetadata(part, value) {
  part.metadata = {
    ...(part.metadata || {}),
    [METADATA_KEY]: value,
  };
}

function attachmentManifest(parts) {
  return (Array.isArray(parts) ? parts : [])
    .filter((part) => part?.type === 'file')
    .slice(0, 20)
    .map((part) => ({
      filename: part.filename || 'unnamed',
      mime: part.mime || 'unknown',
    }));
}

function buildEnhancementPayload(maskedPrompt, attachments) {
  return JSON.stringify({
    current_prompt: maskedPrompt,
    attachments,
  });
}

function parseEnhancedPrompt(value) {
  if (value && typeof value === 'object') {
    return typeof value.enhanced_prompt === 'string'
      ? value.enhanced_prompt
      : undefined;
  }
  if (typeof value !== 'string' || !value.trim()) return undefined;

  const trimmed = value.trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^```(?:json)?\s*|\s*```$/gi, ''),
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed?.enhanced_prompt === 'string') {
        return parsed.enhanced_prompt;
      }
    } catch {}
  }
  return trimmed;
}

function modelTextFromResult(result) {
  if (errorOf(result)) throw errorOf(result);
  const response = dataOf(result);
  const structured = response?.info?.structured ?? response?.structured;
  const structuredValue = parseEnhancedPrompt(structured);
  if (structuredValue) return structuredValue;

  const text = (response?.parts || [])
    .filter((part) =>
      part?.type === 'text' &&
      typeof part.text === 'string' &&
      !part.ignored &&
      !part.synthetic)
    .map((part) => part.text)
    .join('\n')
    .trim();
  const textValue = parseEnhancedPrompt(text);
  if (textValue) return textValue;

  if (response?.info?.error) throw response.info.error;
  throw new Error('enhancer did not return enhanced_prompt');
}

export function createPromptEnhancerHooks(
  { client, directory = process.cwd() } = {},
  {
    timeoutMs = ATTEMPT_TIMEOUT_MS,
    cooldownMs = TRANSIENT_COOLDOWN_MS,
    maxCooldownMs = TRANSIENT_MAX_COOLDOWN_MS,
    hardCooldownMs = HARD_COOLDOWN_MS,
    hardMaxCooldownMs = HARD_MAX_COOLDOWN_MS,
    maxPromptChars = MAX_PROMPT_CHARS,
    now = () => Date.now(),
    enhanceRequest,
    agentsForSession = async () => [PRIMARY_AGENT],
    agentAvailable = async () => true,
  } = {},
) {
  const root = resolve(directory);
  const internalSessions = new Set();
  const breakers = new Map([
    [PRIMARY_AGENT, { failures: 0, until: 0, kind: undefined }],
  ]);
  let warningSignature = '';
  let disposed = false;

  async function toast(message, variant = 'warning') {
    try {
      await client?.tui?.showToast?.({
        body: {
          title: 'Prompt Enhancer',
          message,
          variant,
          duration: 6_000,
        },
        query: { directory: root },
      });
    } catch {}
  }

  async function abortSession(sessionID) {
    try {
      await client?.session?.abort?.({
        path: { id: sessionID },
        query: { directory: root },
      });
    } catch {}
  }

  async function deleteSession(sessionID) {
    try {
      await client?.session?.delete?.({
        path: { id: sessionID },
        query: { directory: root },
      });
    } catch {}
  }

  async function attempt(agent, parentID, payload) {
    if (enhanceRequest) {
      const controller = new AbortController();
      let timer;
      const request = Promise.resolve(enhanceRequest({
        agent,
        payload,
        policy: POLICY,
        signal: controller.signal,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      }));
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new AttemptTimeoutError(agent, timeoutMs));
        }, timeoutMs);
      });
      try {
        const result = await Promise.race([request, timeout]);
        const text = parseEnhancedPrompt(result);
        if (!text) throw new Error('enhancer returned empty text');
        return text;
      } finally {
        clearTimeout(timer);
      }
    }

    let sessionID;
    let timer;
    let timedOut = false;
    try {
      const created = await client?.session?.create?.({
        body: {
          parentID,
          title: `[${agent}] ${basename(root)}`,
        },
        query: { directory: root },
      });
      if (errorOf(created)) throw errorOf(created);
      const session = dataOf(created);
      if (!session?.id) throw new Error('enhancer session was not created');
      sessionID = session.id;
      internalSessions.add(sessionID);

      const request = Promise.resolve(client?.session?.prompt?.({
        path: { id: sessionID },
        query: { directory: root },
        body: {
          agent,
          system: POLICY,
          parts: [{
            type: 'text',
            text: payload,
          }],
        },
      }));
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new AttemptTimeoutError(agent, timeoutMs));
        }, timeoutMs);
      });
      return modelTextFromResult(await Promise.race([request, timeout]));
    } finally {
      clearTimeout(timer);
      if (sessionID) {
        if (timedOut) await abortSession(sessionID);
        await deleteSession(sessionID);
        internalSessions.delete(sessionID);
      }
    }
  }

  function breaker(agent) {
    if (!breakers.has(agent)) {
      breakers.set(agent, { failures: 0, until: 0, kind: undefined });
    }
    return breakers.get(agent);
  }

  function available(agent) {
    return now() >= breaker(agent).until;
  }

  function recordSuccess(agent) {
    const state = breaker(agent);
    state.failures = 0;
    state.until = 0;
    state.kind = undefined;
    warningSignature = '';
  }

  function recordFailure(agent, error) {
    const state = breaker(agent);
    const kind = failureKind(error);
    state.failures += 1;
    state.kind = kind;
    const base = kind === 'hard' ? hardCooldownMs : cooldownMs;
    const ceiling = kind === 'hard' ? hardMaxCooldownMs : maxCooldownMs;
    const exponent = Math.min(state.failures - 1, 20);
    const backoff = Math.min(ceiling, base * (2 ** exponent));
    state.until = now() + Math.max(backoff, retryAfterMs(error, now()));
  }

  function breakerSummary(agent) {
    const state = breaker(agent);
    if (!state.until || available(agent)) return `${agent}:ready`;
    const seconds = Math.max(1, Math.ceil((state.until - now()) / 1_000));
    return `${agent}:${state.kind}:${seconds}s`;
  }

  function reportFailOpen(errors, agents) {
    const signature = agents
      .map((agent) => {
        const state = breaker(agent);
        return `${agent}:${state.failures}:${state.until}:${state.kind}`;
      })
      .join('|');
    if (signature === warningSignature) return;
    warningSignature = signature;

    const detail = errors.length
      ? errors.map(({ agent, error }) =>
        `${agent}: ${errorMessage(error)}`).join('; ')
      : 'all enhancer models are cooling down';
    console.warn(`[prompt-enhancer] Enhancement unavailable: ${detail}`);
    void toast(
      `Original prompt sent. ${agents.map(breakerSummary).join('; ')}.`,
    );
  }

  async function improve(parentID, source, attachments, agents) {
    const protection = protectPrompt(source);
    const payload = buildEnhancementPayload(protection.masked, attachments);
    const errors = [];

    for (const agent of agents) {
      if (!available(agent)) continue;
      if (!await agentAvailable(agent)) {
        errors.push({
          agent,
          error: new Error(`${agent} route unavailable`),
        });
        continue;
      }
      try {
        const output = await attempt(agent, parentID, payload);
        const modelText = validateAndRestore(
          output,
          protection,
          source.length,
        );
        recordSuccess(agent);
        return { modelText, agent };
      } catch (error) {
        recordFailure(agent, error);
        errors.push({ agent, error });
      }
    }

    reportFailOpen(errors, agents);
    return undefined;
  }

  async function rootSession(sessionID) {
    const result = await client?.session?.get?.({
      path: { id: sessionID },
      query: { directory: root },
    });
    if (errorOf(result)) throw errorOf(result);
    const session = dataOf(result);
    return session && !session.parentID;
  }

  function applyModelFacingMessages(messages) {
    for (const message of Array.isArray(messages) ? messages : []) {
      if (message?.info?.role !== 'user') continue;
      const parts = visibleTextParts(message.parts);
      const owner = parts.find((part) =>
        part.metadata?.[METADATA_KEY]?.version === METADATA_VERSION &&
        typeof part.metadata[METADATA_KEY].modelText === 'string');
      if (!owner) continue;
      const metadata = owner.metadata[METADATA_KEY];
      owner.text = metadata.modelText;
      for (const part of parts) {
        if (part !== owner) part.ignored = true;
      }
    }
  }

  return {
    'command.execute.before': async (_input, output) => {
      for (const part of visibleTextParts(output?.parts)) {
        setMetadata(part, {
          version: METADATA_VERSION,
          bypass: 'command',
        });
      }
    },

    'chat.message': async (input, output) => {
      if (disposed) return;
      const sessionID = input?.sessionID ?? output?.message?.sessionID;
      if (!sessionID || internalSessions.has(sessionID)) return;

      let isRoot;
      try {
        isRoot = await rootSession(sessionID);
      } catch (error) {
        console.warn(
          `[prompt-enhancer] Root-session check failed: ${errorMessage(error)}`,
        );
        return;
      }
      if (!isRoot) return;

      const parts = visibleTextParts(output?.parts);
      if (!parts.length) return;
      if (parts.some((part) => part.metadata?.[METADATA_KEY]?.bypass)) return;
      if (parts.some((part) =>
        part.metadata?.[METADATA_KEY]?.version === METADATA_VERSION)) {
        return;
      }

      const raw = rawRemainder(parts[0].text);
      if (raw !== undefined) {
        const modelText = [raw, ...parts.slice(1).map((part) => part.text)]
          .join('\n\n');
        setMetadata(parts[0], {
          version: METADATA_VERSION,
          bypass: 'raw',
          modelText,
          sourceHash: digest(parts.map((part) => part.text).join('\n\n')),
        });
        return;
      }

      const source = parts.map((part) => part.text).join('\n\n');
      if (source.length > maxPromptChars) {
        console.warn(
          `[prompt-enhancer] Prompt exceeds ${maxPromptChars} characters; original sent.`,
        );
        return;
      }

      const selectedAgents = await agentsForSession(sessionID);
      if (!Array.isArray(selectedAgents) || !selectedAgents.length) return;

      const improved = await improve(
        sessionID,
        source,
        attachmentManifest(output?.parts),
        selectedAgents,
      );
      if (!improved) return;
      setMetadata(parts[0], {
        version: METADATA_VERSION,
        modelText: improved.modelText,
        sourceHash: digest(source),
        agent: improved.agent,
      });
    },

    'experimental.chat.messages.transform': async (_input, output) => {
      if (!output || !Array.isArray(output.messages)) return;
      const sessionID = output.messages
        .map((message) => message?.info?.sessionID)
        .find(Boolean);
      if (sessionID && internalSessions.has(sessionID)) return;
      applyModelFacingMessages(output.messages);
    },

    'experimental.chat.system.transform': async (input, output) => {
      if (!input?.sessionID || !internalSessions.has(input.sessionID)) return;
      if (!output || !Array.isArray(output.system)) return;
      output.system.splice(0, output.system.length, POLICY);
    },

    'chat.params': async (input, output) => {
      if (!input?.sessionID || !internalSessions.has(input.sessionID)) return;
      output.maxOutputTokens = Math.min(
        output.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
        MAX_OUTPUT_TOKENS,
      );
    },

    event: async ({ event } = {}) => {
      if (event?.type !== 'session.deleted') return;
      const sessionID =
        event.properties?.info?.id ?? event.properties?.sessionID;
      if (sessionID) internalSessions.delete(sessionID);
    },

    dispose: async () => {
      disposed = true;
      const sessions = [...internalSessions];
      await Promise.all(sessions.map(async (sessionID) => {
        await abortSession(sessionID);
        await deleteSession(sessionID);
      }));
      internalSessions.clear();
    },
  };
}
