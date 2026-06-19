import { WasapiClient } from "@wasapi/js-sdk";
import { loadConfig } from "./config.js";
import { getContext } from "./http/request-context.js";

// stdio mode: a single client from env (unchanged behavior).
let cached: WasapiClient | null = null;

// serve mode: one client per user API key, bounded with simple LRU-ish eviction
// so a long-running server doesn't accumulate clients without limit.
const MAX_HTTP_CLIENTS = 500;
const httpClients = new Map<string, WasapiClient>();

function getHttpClient(apiKey: string, fromId: number | undefined, baseUrl: string): WasapiClient {
  const existing = httpClients.get(apiKey);
  if (existing) {
    // Refresh recency for the bounded-map eviction below.
    httpClients.delete(apiKey);
    httpClients.set(apiKey, existing);
    return existing;
  }
  const client = new WasapiClient({
    apiKey,
    ...(fromId !== undefined ? { from_id: fromId } : {}),
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });
  if (httpClients.size >= MAX_HTTP_CLIENTS) {
    const oldest = httpClients.keys().next().value;
    if (oldest !== undefined) httpClients.delete(oldest);
  }
  httpClients.set(apiKey, client);
  return client;
}

/**
 * Returns the WasapiClient for the current call.
 * - serve mode: keyed off the per-request OAuth context (AsyncLocalStorage).
 * - stdio mode: the env-configured singleton.
 * Tool handlers call this unchanged, so they work in both modes.
 */
export function getClient(): WasapiClient {
  const ctx = getContext();
  if (ctx) {
    return getHttpClient(ctx.wasapiApiKey, ctx.defaultFromId, ctx.baseUrl);
  }
  if (cached) return cached;
  const cfg = loadConfig();
  cached = new WasapiClient({
    apiKey: cfg.apiKey,
    ...(cfg.fromId !== undefined ? { from_id: cfg.fromId } : {}),
    ...(cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
  });
  return cached;
}

export function __resetClientForTests() {
  cached = null;
  httpClients.clear();
}
