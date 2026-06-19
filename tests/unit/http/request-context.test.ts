import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runWithContext, getContext } from "../../../src/http/request-context.js";
import type { RequestContext } from "../../../src/oauth/types.js";

// A WasapiClient stub: record the apiKey each instance was built with.
const built: Array<{ apiKey: string; from_id?: number; baseURL?: string }> = [];
vi.mock("@wasapi/js-sdk", () => ({
  WasapiClient: class {
    constructor(cfg: { apiKey: string; from_id?: number; baseURL?: string }) {
      built.push(cfg);
    }
  },
}));

const ctx = (apiKey: string, userId: number, defaultFromId?: number): RequestContext => ({
  wasapiApiKey: apiKey,
  userId,
  defaultFromId,
  baseUrl: "https://api.test/api/",
});

describe("request-context (AsyncLocalStorage)", () => {
  it("propagates context across awaits", async () => {
    await runWithContext(ctx("key-a", 1), async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 1));
      expect(getContext()?.wasapiApiKey).toBe("key-a");
    });
    expect(getContext()).toBeUndefined();
  });

  it("isolates concurrent contexts", async () => {
    const seen: string[] = [];
    await Promise.all([
      runWithContext(ctx("key-1", 1), async () => {
        await new Promise((r) => setTimeout(r, 5));
        seen.push(getContext()!.wasapiApiKey);
      }),
      runWithContext(ctx("key-2", 2), async () => {
        await new Promise((r) => setTimeout(r, 1));
        seen.push(getContext()!.wasapiApiKey);
      }),
    ]);
    expect(seen.sort()).toEqual(["key-1", "key-2"]);
  });
});

describe("getClient() isolation by context", () => {
  beforeEach(() => {
    built.length = 0;
  });
  afterEach(async () => {
    const { __resetClientForTests } = await import("../../../src/wasapi.js");
    __resetClientForTests();
  });

  it("builds a distinct client per API key in serve mode", async () => {
    const { getClient, __resetClientForTests } = await import("../../../src/wasapi.js");
    __resetClientForTests();
    built.length = 0;

    await runWithContext(ctx("key-1", 1, 100), async () => {
      getClient();
      getClient(); // cached → no second build
    });
    await runWithContext(ctx("key-2", 2, 200), async () => {
      getClient();
    });

    expect(built.map((b) => b.apiKey)).toEqual(["key-1", "key-2"]);
    expect(built[0].from_id).toBe(100);
    expect(built[1].from_id).toBe(200);
  });

  it("falls back to the env singleton in stdio mode", async () => {
    const { getClient, __resetClientForTests } = await import("../../../src/wasapi.js");
    __resetClientForTests();
    built.length = 0;
    const prev = process.env.WASAPI_API_KEY;
    process.env.WASAPI_API_KEY = "env-key";

    getClient();
    getClient(); // singleton cached
    expect(built.map((b) => b.apiKey)).toEqual(["env-key"]);

    if (prev === undefined) delete process.env.WASAPI_API_KEY;
    else process.env.WASAPI_API_KEY = prev;
  });
});
