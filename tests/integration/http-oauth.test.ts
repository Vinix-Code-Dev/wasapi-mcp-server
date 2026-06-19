// HTTP integration test for serve mode. Self-contained: the backend grant
// exchange is injected (fetchImpl) and the Wasapi SDK is mocked, so no network.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import request from "supertest";

// Mock the Wasapi SDK so get_current_user echoes the API key the client was
// built with — lets us assert per-tenant isolation through the real HTTP path.
vi.mock("@wasapi/js-sdk", () => ({
  WasapiClient: class {
    user: { getUser: () => Promise<unknown> };
    constructor(public config: { apiKey: string }) {
      this.user = { getUser: async () => ({ apiKey: config.apiKey }) };
    }
  },
}));

import { buildHttpApp } from "../../src/http/app.js";
import { allTools } from "../../src/tools/index.js";
import type { ServeConfig } from "../../src/config.js";
import { MemStore } from "../unit/oauth/mem-store.js";

const config: ServeConfig = {
  port: 3000,
  issuerUrl: "https://mcp.test",
  publicUrl: "https://mcp.test",
  wasapiBaseUrl: "https://api.test/api/",
  redisUrl: "redis://x",
  tokenHashSecret: "token-hash-secret-aaaaaaaaaaaa",
  keyEncryptionSecret: "key-encryption-secret-bbbbbbbb",
  grantExchangeSecret: "grant-exchange-secret-cccccccc",
  consentUrl: "https://app.test/oauth/mcp",
  ttls: { loginSession: 600, authCode: 60, accessToken: 3600, refreshToken: 2592000, client: 7776000 },
  debug: false,
};

// Maps grant_code -> the API key / identity the "backend" would return.
const GRANTS: Record<string, { wasapi_api_key: string; user_id: number; org_id: number; default_from_id: number }> = {
  grant_alice: { wasapi_api_key: "key_alice", user_id: 1, org_id: 10, default_from_id: 100 },
  grant_bob: { wasapi_api_key: "key_bob", user_id: 2, org_id: 20, default_from_id: 200 },
};

const fakeFetch = (async (_url: any, init: any) => {
  const { grant_code } = JSON.parse(init.body);
  const payload = GRANTS[grant_code];
  if (!payload) return new Response("not found", { status: 404 });
  return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
}) as unknown as typeof fetch;

const pkce = () => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
};

function locationOf(res: request.Response): URL {
  return new URL(res.headers.location);
}

// Parse a Streamable HTTP response (JSON or SSE) into the JSON-RPC payload.
function parseMcp(res: request.Response): any {
  const text = res.text ?? "";
  if (res.headers["content-type"]?.includes("application/json")) return JSON.parse(text);
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  return line ? JSON.parse(line.slice(5).trim()) : undefined;
}

async function runFullFlow(app: any, grantCode: string) {
  // (3) Dynamic client registration.
  const reg = await request(app)
    .post("/register")
    .send({ redirect_uris: ["https://claude.ai/cb"], token_endpoint_auth_method: "none" });
  expect(reg.status).toBe(201);
  const clientId = reg.body.client_id as string;

  // (4) Authorize → 302 to consent screen with sid.
  const { verifier, challenge } = pkce();
  const authorize = await request(app).get("/authorize").query({
    response_type: "code",
    client_id: clientId,
    redirect_uri: "https://claude.ai/cb",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "st-1",
    scope: "wasapi",
  });
  expect(authorize.status).toBe(302);
  const consent = locationOf(authorize);
  expect(consent.origin + consent.pathname).toBe("https://app.test/oauth/mcp");
  const sid = consent.searchParams.get("sid")!;

  // (6)-(8) The web app + backend produce a grant; simulate the redirect to our callback.
  const callback = await request(app).get("/oauth/callback").query({ sid, grant: grantCode });
  expect(callback.status).toBe(302);
  const back = locationOf(callback);
  expect(back.origin + back.pathname).toBe("https://claude.ai/cb");
  expect(back.searchParams.get("state")).toBe("st-1");
  const code = back.searchParams.get("code")!;

  // (11) Token exchange with PKCE verifier.
  const token = await request(app)
    .post("/token")
    .type("form")
    .send({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: "https://claude.ai/cb",
      client_id: clientId,
    });
  expect(token.status).toBe(200);
  expect(token.body.access_token).toBeTruthy();
  return token.body.access_token as string;
}

describe("serve-mode HTTP", () => {
  let app: any;
  beforeEach(() => {
    app = buildHttpApp({ config, store: new MemStore(), fetchImpl: fakeFetch });
  });

  it("exposes OAuth authorization-server metadata", async () => {
    const res = await request(app).get("/.well-known/oauth-authorization-server");
    expect(res.status).toBe(200);
    // URL serialization adds the root trailing slash to the issuer.
    expect(res.body.issuer).toBe("https://mcp.test/");
    expect(res.body.authorization_endpoint).toBe("https://mcp.test/authorize");
    expect(res.body.token_endpoint).toBe("https://mcp.test/token");
    expect(res.body.registration_endpoint).toBe("https://mcp.test/register");
  });

  it("exposes protected-resource metadata", async () => {
    const res = await request(app).get("/.well-known/oauth-protected-resource");
    expect(res.status).toBe(200);
    expect(res.body.resource).toBe("https://mcp.test/");
  });

  it("rejects /mcp without a bearer token (401 + WWW-Authenticate)", async () => {
    const res = await request(app).post("/mcp").send({ jsonrpc: "2.0", method: "tools/list", id: 1 });
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toMatch(/Bearer/);
  });

  it("readyz reports redis health", async () => {
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(200);
    expect(res.body.redis).toBe(true);
  });

  it("completes the full OAuth flow and lists all tools", async () => {
    const accessToken = await runFullFlow(app, "grant_alice");
    const res = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", method: "tools/list", id: 1 });
    expect(res.status).toBe(200);
    const body = parseMcp(res);
    expect(body.result.tools.length).toBe(allTools.length);
  });

  it("isolates tenants: each token's tool calls use its own API key", async () => {
    const aliceToken = await runFullFlow(app, "grant_alice");
    const bobToken = await runFullFlow(app, "grant_bob");

    const call = (tok: string) =>
      request(app)
        .post("/mcp")
        .set("Authorization", `Bearer ${tok}`)
        .set("Accept", "application/json, text/event-stream")
        .send({ jsonrpc: "2.0", method: "tools/call", id: 2, params: { name: "get_current_user", arguments: {} } });

    const [aliceRes, bobRes] = await Promise.all([call(aliceToken), call(bobToken)]);
    const aliceBody = JSON.parse(parseMcp(aliceRes).result.content[0].text);
    const bobBody = JSON.parse(parseMcp(bobRes).result.content[0].text);
    expect(aliceBody.apiKey).toBe("key_alice");
    expect(bobBody.apiKey).toBe("key_bob");
  });
});
