import { WasapiClient } from "@wasapi/js-sdk";
import { mapError, type ErrorCategory } from "../lib/errors.js";

export interface WhatsappNumber {
  id: number;
  phone?: string;
  [k: string]: unknown;
}

export type ValidateResult =
  | { ok: true; numbers: WhatsappNumber[] }
  | { ok: false; category: ErrorCategory; message: string };

export interface ValidateOpts {
  clientFactory?: (apiKey: string) => unknown;
}

export async function validateKey(apiKey: string, opts: ValidateOpts = {}): Promise<ValidateResult> {
  const client = (opts.clientFactory ?? ((k: string) => new WasapiClient(k as never)))(apiKey) as {
    whatsapp: { getWhatsappNumbers: () => Promise<unknown> };
  };
  try {
    const result = await client.whatsapp.getWhatsappNumbers();
    const numbers: WhatsappNumber[] = Array.isArray((result as { data?: unknown[] })?.data)
      ? ((result as { data: WhatsappNumber[] }).data)
      : Array.isArray(result)
        ? (result as WhatsappNumber[])
        : [];
    return { ok: true, numbers };
  } catch (err) {
    const m = mapError(err);
    return { ok: false, category: m.category, message: m.message };
  }
}
