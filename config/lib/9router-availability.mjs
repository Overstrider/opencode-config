import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const NINE_ROUTER_URL = 'http://127.0.0.1:20128';
export const AVAILABILITY_CACHE_MS = 1_000;
export const AVAILABILITY_TIMEOUT_MS = 500;

function dataDirectory(platform, appData, home) {
  if (platform === 'win32') {
    return join(appData || join(home, 'AppData', 'Roaming'), '9router');
  }
  return join(home, '.9router');
}

function cliToken(readFile, directory) {
  const machineID = readFile(join(directory, 'machine-id'), 'utf8').trim();
  const secret = readFile(
    join(directory, 'auth', 'cli-secret'),
    'utf8',
  ).trim();
  return createHash('sha256')
    .update(`${machineID}9r-cli-auth${secret}`)
    .digest('hex')
    .slice(0, 16);
}

function normalizedModel(model) {
  const value = String(model || '');
  return value.includes('/') ? value.slice(value.lastIndexOf('/') + 1) : value;
}

export function create9RouterAvailability({
  baseURL = NINE_ROUTER_URL,
  fetchImpl = globalThis.fetch,
  readFile = readFileSync,
  platform = process.platform,
  appData = process.env.APPDATA,
  home = homedir(),
  now = () => Date.now(),
  cacheMs = AVAILABILITY_CACHE_MS,
  timeoutMs = AVAILABILITY_TIMEOUT_MS,
} = {}) {
  let cache;

  async function snapshot() {
    const currentTime = now();
    if (cache && currentTime < cache.until) return cache.value;

    let value;
    try {
      const directory = dataDirectory(platform, appData, home);
      const token = cliToken(readFile, directory);
      const response = await fetchImpl(`${baseURL}/api/models/availability`, {
        headers: { 'x-9r-cli-token': token },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`9router returned ${response.status}`);
      const payload = await response.json();
      value = Array.isArray(payload?.models) ? payload.models : [];
    } catch {
      value = undefined;
    }

    cache = { until: currentTime + cacheMs, value };
    return value;
  }

  async function modelUnavailable(provider, model) {
    const models = await snapshot();
    if (!models) return undefined;
    const target = normalizedModel(model);
    return models.some((entry) =>
      entry?.provider === provider &&
      (entry.model === '__all' || normalizedModel(entry.model) === target) &&
      (entry.status === 'cooldown' || entry.status === 'unavailable'));
  }

  return {
    modelUnavailable,
    snapshot,
  };
}

export const nineRouterAvailability = create9RouterAvailability();
