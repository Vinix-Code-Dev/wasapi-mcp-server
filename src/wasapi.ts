import { WasapiClient } from "@wasapi/js-sdk";
import { loadConfig, type Config } from "./config.js";

let cached: WasapiClient | null = null;

export function getClient(): WasapiClient {
  if (cached) return cached;
  const cfg = loadConfig();
  cached = new WasapiClient({
    apiKey: cfg.apiKey,
    from_id: cfg.fromId,
    ...(cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
  });
  return cached;
}

export function __resetClientForTests() {
  cached = null;
}
