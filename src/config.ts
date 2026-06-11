import { z } from "zod";

const schema = z.object({
  WASAPI_API_KEY: z.string().min(1, "WASAPI_API_KEY is required. Get yours at https://app.wasapi.io/"),
  WASAPI_FROM_ID: z.string().optional(),
  WASAPI_BASE_URL: z.string().url().optional(),
  WASAPI_DEBUG: z.string().optional(),
});

export interface Config {
  apiKey: string;
  fromId?: number;
  baseUrl?: string;
  debug: boolean;
}

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => (i.path.length > 0 ? `${i.path.join(".")}: ${i.message}` : i.message))
      .join("; ");
    throw new Error(`Invalid configuration: ${msg}`);
  }
  const env = parsed.data;
  return {
    apiKey: env.WASAPI_API_KEY,
    fromId: env.WASAPI_FROM_ID ? Number(env.WASAPI_FROM_ID) : undefined,
    baseUrl: env.WASAPI_BASE_URL,
    debug: env.WASAPI_DEBUG === "1",
  };
}
