// tests/unit/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, loadServeConfig } from "../../src/config.js";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.WASAPI_API_KEY;
    delete process.env.WASAPI_FROM_ID;
    delete process.env.WASAPI_BASE_URL;
    delete process.env.WASAPI_DEBUG;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when WASAPI_API_KEY is missing", () => {
    expect(() => loadConfig()).toThrow(/WASAPI_API_KEY/);
  });

  it("loads minimal config with only API key", () => {
    process.env.WASAPI_API_KEY = "k_test";
    const c = loadConfig();
    expect(c.apiKey).toBe("k_test");
    expect(c.fromId).toBeUndefined();
    expect(c.debug).toBe(false);
  });

  it("parses fromId as number", () => {
    process.env.WASAPI_API_KEY = "k_test";
    process.env.WASAPI_FROM_ID = "12345";
    expect(loadConfig().fromId).toBe(12345);
  });

  it("enables debug when WASAPI_DEBUG=1", () => {
    process.env.WASAPI_API_KEY = "k";
    process.env.WASAPI_DEBUG = "1";
    expect(loadConfig().debug).toBe(true);
  });
});

describe("loadServeConfig", () => {
  const baseEnv = {
    OAUTH_ISSUER_URL: "https://mcp.test",
    MCP_PUBLIC_URL: "https://mcp.test",
    WASAPI_BASE_URL: "https://api.test/api/v1/",
    WASAPI_OAUTH_BASE_URL: "https://api.test/api/",
    REDIS_URL: "redis://x",
    TOKEN_HASH_SECRET: "token-hash-secret-aaaaaaaaaaaa",
    KEY_ENCRYPTION_SECRET: "key-encryption-secret-bbbbbbbb",
    GRANT_EXCHANGE_SECRET: "grant-exchange-secret-cccccccc",
  };

  it("keeps the versioned SDK base and the unversioned OAuth base as distinct values", () => {
    const config = loadServeConfig(baseEnv as NodeJS.ProcessEnv);
    expect(config.wasapiBaseUrl).toBe("https://api.test/api/v1/");
    expect(config.wasapiOAuthBaseUrl).toBe("https://api.test/api/");
  });

  it("throws when WASAPI_OAUTH_BASE_URL is missing", () => {
    const { WASAPI_OAUTH_BASE_URL, ...env } = baseEnv;
    expect(() => loadServeConfig(env as NodeJS.ProcessEnv)).toThrow(/WASAPI_OAUTH_BASE_URL/);
  });
});
