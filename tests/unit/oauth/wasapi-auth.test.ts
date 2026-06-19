import { describe, it, expect, vi } from "vitest";
import { exchangeGrant, GRANT_SECRET_HEADER } from "../../../src/oauth/wasapi-auth.js";

const deps = (fetchImpl: typeof fetch) => ({
  wasapiBaseUrl: "https://api.test/api/",
  grantExchangeSecret: "shared-secret",
  fetchImpl,
});

describe("exchangeGrant", () => {
  it("posts the grant + shared secret and maps the payload", async () => {
    const fetchImpl = vi.fn(async (url: any, init: any) => {
      expect(url).toBe("https://api.test/api/v3/oauth/mcp/exchange-grant");
      expect(init.headers[GRANT_SECRET_HEADER]).toBe("shared-secret");
      expect(JSON.parse(init.body)).toEqual({ grant_code: "g_123" });
      return new Response(
        JSON.stringify({ wasapi_api_key: "wsp_k", user_id: 5, org_id: 9, default_from_id: 11 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const grant = await exchangeGrant("g_123", deps(fetchImpl));
    expect(grant).toEqual({ wasapiApiKey: "wsp_k", userId: 5, orgId: 9, defaultFromId: 11 });
  });

  it("throws on invalid shared secret (401)", async () => {
    const fetchImpl = vi.fn(async () => new Response("forbidden", { status: 401 })) as unknown as typeof fetch;
    await expect(exchangeGrant("g_123", deps(fetchImpl))).rejects.toThrow(/exchange-grant failed \(401\)/);
  });

  it("throws on expired/unknown grant (404)", async () => {
    const fetchImpl = vi.fn(async () => new Response("not found", { status: 404 })) as unknown as typeof fetch;
    await expect(exchangeGrant("g_x", deps(fetchImpl))).rejects.toThrow(/exchange-grant failed \(404\)/);
  });

  it("throws when the payload is missing the api key", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ user_id: 1 }), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(exchangeGrant("g_x", deps(fetchImpl))).rejects.toThrow(/invalid payload/);
  });
});
