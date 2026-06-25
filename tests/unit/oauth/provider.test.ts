import { describe, it, expect, beforeEach } from "vitest";
import type { Response } from "express";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { WasapiOAuthProvider } from "../../../src/oauth/provider.js";
import type { ServeConfig } from "../../../src/config.js";
import type { LoginSession, UserGrant } from "../../../src/oauth/types.js";
import { MemStore } from "./mem-store.js";

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

const client = {
  client_id: "client-1",
  client_name: "Claude",
  redirect_uris: ["https://claude.ai/cb"],
} as OAuthClientInformationFull;

const session: LoginSession = {
  clientId: "client-1",
  redirectUri: "https://claude.ai/cb",
  codeChallenge: "challenge-xyz",
  state: "state-1",
  scope: ["wasapi"],
};

const grant: UserGrant = { wasapiApiKey: "wsp_secret_key", userId: 42, orgId: 7, defaultFromId: 99 };

function fakeRes() {
  const calls: { status: number; url: string }[] = [];
  return {
    redirect: (status: number, url: string) => calls.push({ status, url }),
    _calls: calls,
  } as unknown as Response & { _calls: { status: number; url: string }[] };
}

describe("WasapiOAuthProvider", () => {
  let store: MemStore;
  let provider: WasapiOAuthProvider;

  beforeEach(() => {
    store = new MemStore();
    provider = new WasapiOAuthProvider({ store, config });
  });

  it("authorize() persists a login session and redirects to the consent screen", async () => {
    const res = fakeRes();
    await provider.authorize(
      client,
      { redirectUri: "https://claude.ai/cb", codeChallenge: "challenge-xyz", state: "state-1", scopes: ["wasapi"] },
      res,
    );
    expect(store.logins.size).toBe(1);
    const [{ status, url }] = (res as any)._calls;
    expect(status).toBe(302);
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://app.test/oauth/mcp");
    expect(u.searchParams.get("sid")).toBeTruthy();
    expect(u.searchParams.get("redirect")).toBe("https://mcp.test/oauth/callback");
    // The requesting AI's name is forwarded to the consent screen.
    expect(u.searchParams.get("app")).toBe("Claude");
    // The persisted session carries the original PKCE challenge.
    const sid = u.searchParams.get("sid")!;
    expect(store.logins.get(sid)?.codeChallenge).toBe("challenge-xyz");
  });

  it("createAuthCode() stores the challenge and encrypts the API key", async () => {
    const code = await provider.createAuthCode(session, grant);
    const stored = store.codes.get(code)!;
    expect(stored.codeChallenge).toBe("challenge-xyz");
    expect(stored.userId).toBe(42);
    // API key is NOT stored in plaintext.
    expect(stored.encryptedApiKey).not.toContain("wsp_secret_key");
  });

  it("challengeForAuthorizationCode() returns the stored PKCE challenge", async () => {
    const code = await provider.createAuthCode(session, grant);
    expect(await provider.challengeForAuthorizationCode(client, code)).toBe("challenge-xyz");
  });

  it("exchangeAuthorizationCode() issues tokens and is single-use", async () => {
    const code = await provider.createAuthCode(session, grant);
    const tokens = await provider.exchangeAuthorizationCode(client, code, undefined, "https://claude.ai/cb");
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    expect(tokens.token_type).toBe("Bearer");
    // Second use of the same code fails.
    await expect(provider.exchangeAuthorizationCode(client, code)).rejects.toThrow(/Invalid or expired/);
  });

  it("exchangeAuthorizationCode() rejects a redirect_uri mismatch", async () => {
    const code = await provider.createAuthCode(session, grant);
    await expect(
      provider.exchangeAuthorizationCode(client, code, undefined, "https://evil.example/cb"),
    ).rejects.toThrow(/redirect_uri/);
  });

  it("verifyAccessToken() returns AuthInfo with decrypted key in extra", async () => {
    const code = await provider.createAuthCode(session, grant);
    const tokens = await provider.exchangeAuthorizationCode(client, code, undefined, "https://claude.ai/cb");
    const info = await provider.verifyAccessToken(tokens.access_token);
    expect(info.clientId).toBe("client-1");
    expect(info.scopes).toEqual(["wasapi"]);
    expect(typeof info.expiresAt).toBe("number");
    expect(info.extra).toMatchObject({ wasapiApiKey: "wsp_secret_key", userId: 42, orgId: 7, defaultFromId: 99 });
  });

  it("verifyAccessToken() throws on an unknown token", async () => {
    await expect(provider.verifyAccessToken("nope")).rejects.toThrow();
  });

  it("exchangeRefreshToken() rotates tokens and invalidates the old one on reuse", async () => {
    const code = await provider.createAuthCode(session, grant);
    const first = await provider.exchangeAuthorizationCode(client, code, undefined, "https://claude.ai/cb");

    const second = await provider.exchangeRefreshToken(client, first.refresh_token!);
    expect(second.refresh_token).toBeTruthy();
    expect(second.refresh_token).not.toBe(first.refresh_token);

    // Replaying the now-rotated first refresh token is reuse → family revoked.
    await expect(provider.exchangeRefreshToken(client, first.refresh_token!)).rejects.toThrow(/reuse/);
    // After family revocation even the latest refresh token is dead.
    await expect(provider.exchangeRefreshToken(client, second.refresh_token!)).rejects.toThrow(/revoked/);
  });

  it("revokeToken() removes access + refresh entries", async () => {
    const code = await provider.createAuthCode(session, grant);
    const tokens = await provider.exchangeAuthorizationCode(client, code, undefined, "https://claude.ai/cb");
    await provider.revokeToken(client, { token: tokens.access_token });
    await expect(provider.verifyAccessToken(tokens.access_token)).rejects.toThrow();
    await provider.revokeToken(client, { token: tokens.refresh_token! });
    await expect(provider.exchangeRefreshToken(client, tokens.refresh_token!)).rejects.toThrow();
  });
});
