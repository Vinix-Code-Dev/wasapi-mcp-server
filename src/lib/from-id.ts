import { loadConfig } from "../config.js";

/**
 * Resolves the from_id to use for WhatsApp operations.
 * Priority: explicit parameter > WASAPI_FROM_ID env var > error.
 * Use list_whatsapp_numbers to discover available from_id values.
 */
export function resolveFromId(provided?: number): number {
  if (provided !== undefined) return provided;
  const cfg = loadConfig();
  if (cfg.fromId !== undefined) return cfg.fromId;
  throw new Error(
    "from_id is required: pass it as a parameter or set WASAPI_FROM_ID. Use list_whatsapp_numbers to discover available IDs.",
  );
}
