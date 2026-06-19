import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveFromId } from "../../../src/lib/from-id.js";
import { runWithContext } from "../../../src/http/request-context.js";
import type { RequestContext } from "../../../src/oauth/types.js";

const ctx = (defaultFromId?: number): RequestContext => ({
  wasapiApiKey: "k",
  userId: 1,
  defaultFromId,
  baseUrl: "https://api.test/api/",
});

describe("resolveFromId", () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.WASAPI_API_KEY;
    delete process.env.WASAPI_FROM_ID;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("prefers an explicit parameter", () => {
    expect(resolveFromId(123)).toBe(123);
  });

  it("uses the ALS context defaultFromId in serve mode", () => {
    runWithContext(ctx(555), () => {
      expect(resolveFromId()).toBe(555);
    });
  });

  it("throws (without reading env) when serve context has no defaultFromId", () => {
    runWithContext(ctx(undefined), () => {
      expect(() => resolveFromId()).toThrow(/from_id is required/);
    });
  });

  it("falls back to WASAPI_FROM_ID in stdio mode", () => {
    process.env.WASAPI_API_KEY = "k";
    process.env.WASAPI_FROM_ID = "777";
    expect(resolveFromId()).toBe(777);
  });

  it("throws in stdio mode when neither param nor env is set", () => {
    process.env.WASAPI_API_KEY = "k";
    expect(() => resolveFromId()).toThrow(/from_id is required/);
  });
});
