// tests/unit/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";

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
