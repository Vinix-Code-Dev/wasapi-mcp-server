import { loadConfig } from "../config.js";
import { getContext } from "../http/request-context.js";

const MISSING =
  "from_id is required: pass it as a parameter or set WASAPI_FROM_ID. Use list_whatsapp_numbers to discover available IDs.";

/**
 * Resolves the from_id to use for WhatsApp operations.
 * Priority: explicit parameter > per-request OAuth context (serve mode) >
 * WASAPI_FROM_ID env var (stdio) > error.
 *
 * In serve mode we must NOT call loadConfig() — it requires WASAPI_API_KEY,
 * which serve mode doesn't set — so the request-context branch is fully
 * self-contained.
 */
export function resolveFromId(provided?: number): number {
  if (provided !== undefined) return provided;

  const ctx = getContext();
  if (ctx) {
    if (ctx.defaultFromId !== undefined) return ctx.defaultFromId;
    throw new Error(MISSING);
  }

  const cfg = loadConfig();
  if (cfg.fromId !== undefined) return cfg.fromId;
  throw new Error(MISSING);
}
