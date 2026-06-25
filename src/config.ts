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

// ---------------------------------------------------------------------------
// Serve (remote OAuth) mode configuration.
//
// stdio mode keeps using loadConfig() above (a single WASAPI_API_KEY per
// process). Serve mode authenticates per-user via OAuth, so it must NOT
// require WASAPI_API_KEY — instead it needs the HTTP/OAuth/Redis settings
// below. Keeping this in a separate loader means importing the http modules
// never forces an env var that only stdio needs (and vice-versa).
// ---------------------------------------------------------------------------

const positiveIntFromEnv = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : Number(v)))
    .pipe(z.number().int().positive());

const serveSchema = z.object({
  PORT: positiveIntFromEnv(3000),
  OAUTH_ISSUER_URL: z.string().url(),
  MCP_PUBLIC_URL: z.string().url(),
  WASAPI_BASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1, "REDIS_URL is required in serve mode"),
  TOKEN_HASH_SECRET: z.string().min(16, "TOKEN_HASH_SECRET must be at least 16 chars"),
  KEY_ENCRYPTION_SECRET: z.string().min(16, "KEY_ENCRYPTION_SECRET must be at least 16 chars"),
  GRANT_EXCHANGE_SECRET: z.string().min(16, "GRANT_EXCHANGE_SECRET must be at least 16 chars"),
  // Web app screen that performs login (SSO/2FA) + consent. Receives ?sid&redirect.
  CONSENT_URL: z.string().url().optional(),
  // TTLs in seconds.
  LOGIN_SESSION_TTL: positiveIntFromEnv(600), // 10 min
  AUTH_CODE_TTL: positiveIntFromEnv(60), // 1 min
  ACCESS_TOKEN_TTL: positiveIntFromEnv(3600), // 1 h
  REFRESH_TOKEN_TTL: positiveIntFromEnv(60 * 60 * 24 * 30), // 30 days
  CLIENT_TTL: positiveIntFromEnv(60 * 60 * 24 * 90), // 90 days for DCR records
  WASAPI_DEBUG: z.string().optional(),
});

export interface ServeConfig {
  port: number;
  issuerUrl: string;
  publicUrl: string;
  wasapiBaseUrl: string;
  redisUrl: string;
  tokenHashSecret: string;
  keyEncryptionSecret: string;
  grantExchangeSecret: string;
  consentUrl: string;
  ttls: {
    loginSession: number;
    authCode: number;
    accessToken: number;
    refreshToken: number;
    client: number;
  };
  debug: boolean;
}

const stripTrailingSlash = (u: string) => u.replace(/\/+$/, "");

export function loadServeConfig(env: NodeJS.ProcessEnv = process.env): ServeConfig {
  const parsed = serveSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => (i.path.length > 0 ? `${i.path.join(".")}: ${i.message}` : i.message))
      .join("; ");
    throw new Error(`Invalid serve configuration: ${msg}`);
  }
  const e = parsed.data;
  return {
    port: e.PORT,
    issuerUrl: stripTrailingSlash(e.OAUTH_ISSUER_URL),
    publicUrl: stripTrailingSlash(e.MCP_PUBLIC_URL),
    // The SDK base URL must NOT have a trailing slash collapsed away — keep as given.
    wasapiBaseUrl: e.WASAPI_BASE_URL,
    redisUrl: e.REDIS_URL,
    tokenHashSecret: e.TOKEN_HASH_SECRET,
    keyEncryptionSecret: e.KEY_ENCRYPTION_SECRET,
    grantExchangeSecret: e.GRANT_EXCHANGE_SECRET,
    consentUrl: stripTrailingSlash(e.CONSENT_URL ?? "https://app.wasapi.io/oauth/mcp"),
    ttls: {
      loginSession: e.LOGIN_SESSION_TTL,
      authCode: e.AUTH_CODE_TTL,
      accessToken: e.ACCESS_TOKEN_TTL,
      refreshToken: e.REFRESH_TOKEN_TTL,
      client: e.CLIENT_TTL,
    },
    debug: e.WASAPI_DEBUG === "1",
  };
}
