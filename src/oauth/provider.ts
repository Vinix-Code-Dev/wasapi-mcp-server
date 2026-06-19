import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidGrantError,
  InvalidTokenError,
  ServerError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { ServeConfig } from "../config.js";
import type { OAuthStore } from "./redis-store.js";
import { RedisClientsStore } from "./clients-store.js";
import { generateOpaqueToken, hashToken, encryptSecret, decryptSecret } from "./crypto.js";
import type { LoginSession, UserGrant } from "./types.js";

const nowSeconds = () => Math.floor(Date.now() / 1000);

export interface WasapiOAuthProviderDeps {
  store: OAuthStore;
  config: ServeConfig;
}

/**
 * The MCP proxy acts as its own OAuth 2.1 Authorization + Resource Server.
 * Login itself is delegated to the Wasapi web app (Variant B): authorize()
 * redirects to the consent screen, and the auth code is minted later in
 * oauth-callback.ts via createAuthCode() once the backend grant is exchanged.
 */
export class WasapiOAuthProvider implements OAuthServerProvider {
  private readonly store: OAuthStore;
  private readonly config: ServeConfig;
  private readonly _clientsStore: RedisClientsStore;
  public skipLocalPkceValidation = false; // SDK validates PKCE locally against our stored challenge

  constructor(deps: WasapiOAuthProviderDeps) {
    this.store = deps.store;
    this.config = deps.config;
    this._clientsStore = new RedisClientsStore(this.store, this.config.ttls.client);
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  /**
   * Step (4)-(5): persist the pending authorization keyed by an opaque sid and
   * redirect the browser to the web app's consent screen. The web app will
   * send the user back to our /oauth/callback with the sid + a backend grant.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const sid = generateOpaqueToken(24);
    const session: LoginSession = {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      state: params.state,
      scope: params.scopes ?? [],
    };
    await this.store.putLoginSession(sid, session, this.config.ttls.loginSession);

    const callbackUrl = `${this.config.publicUrl}/oauth/callback`;
    const target = new URL(this.config.consentUrl);
    target.searchParams.set("sid", sid);
    target.searchParams.set("redirect", callbackUrl);
    // Pass the requesting AI's registered name so the consent screen and the
    // issued API key aren't hardcoded to "Claude". client_name is optional and
    // client-controlled — the web app/backend sanitize it before display/use.
    if (client.client_name) {
      target.searchParams.set("app", client.client_name);
    }
    res.redirect(302, target.toString());
  }

  /**
   * Called by oauth-callback.ts after the server-to-server grant exchange.
   * Mints the single-use MCP authorization code (Redis, short TTL), carrying
   * the encrypted Wasapi API key + identity and the original PKCE challenge.
   * Returns the code to append to the client's redirect_uri.
   */
  async createAuthCode(session: LoginSession, grant: UserGrant): Promise<string> {
    const code = generateOpaqueToken(32);
    await this.store.putAuthCode(
      code,
      {
        clientId: session.clientId,
        redirectUri: session.redirectUri,
        codeChallenge: session.codeChallenge,
        scope: session.scope,
        encryptedApiKey: encryptSecret(grant.wasapiApiKey, this.config.keyEncryptionSecret),
        userId: grant.userId,
        orgId: grant.orgId,
        defaultFromId: grant.defaultFromId,
      },
      this.config.ttls.authCode,
    );
    return code;
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const stored = await this.store.getAuthCode(authorizationCode);
    if (!stored) throw new InvalidGrantError("Invalid or expired authorization code");
    return stored.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    const stored = await this.store.takeAuthCode(authorizationCode); // single-use
    if (!stored) throw new InvalidGrantError("Invalid or expired authorization code");
    if (stored.clientId !== client.client_id) {
      throw new InvalidGrantError("Authorization code was issued to a different client");
    }
    if (redirectUri !== undefined && redirectUri !== stored.redirectUri) {
      throw new InvalidGrantError("redirect_uri does not match the authorization request");
    }

    const familyId = generateOpaqueToken(16);
    return this.issueTokens({
      clientId: client.client_id,
      scope: stored.scope,
      encryptedApiKey: stored.encryptedApiKey,
      userId: stored.userId,
      orgId: stored.orgId,
      defaultFromId: stored.defaultFromId,
      familyId,
    });
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
  ): Promise<OAuthTokens> {
    const hash = hashToken(refreshToken, this.config.tokenHashSecret);
    const stored = await this.store.getRefreshToken(hash);
    if (!stored) throw new InvalidGrantError("Invalid or expired refresh token");
    if (stored.clientId !== client.client_id) {
      throw new InvalidGrantError("Refresh token was issued to a different client");
    }

    const current = await this.store.getFamily(stored.familyId);
    if (!current) throw new InvalidGrantError("Refresh token family has been revoked");
    if (current !== hash) {
      // A rotated (no longer current) refresh token is being replayed → reuse.
      // Revoke the whole family so the attacker's chain is dead too.
      await this.store.delFamily(stored.familyId);
      throw new InvalidGrantError("Refresh token reuse detected; family revoked");
    }

    // Rotate: keep the same family/identity, narrow scope if requested.
    const scope = scopes && scopes.length > 0 ? scopes : stored.scope;
    return this.issueTokens({
      clientId: stored.clientId,
      scope,
      encryptedApiKey: stored.encryptedApiKey,
      userId: stored.userId,
      orgId: stored.orgId,
      defaultFromId: stored.defaultFromId,
      familyId: stored.familyId,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const hash = hashToken(token, this.config.tokenHashSecret);
    const stored = await this.store.getAccessToken(hash);
    if (!stored) throw new InvalidTokenError("Invalid or expired access token");

    let wasapiApiKey: string;
    try {
      wasapiApiKey = decryptSecret(stored.encryptedApiKey, this.config.keyEncryptionSecret);
    } catch {
      throw new ServerError("Failed to decrypt stored credentials");
    }

    return {
      token,
      clientId: stored.clientId,
      scopes: stored.scope,
      expiresAt: stored.expiresAt,
      extra: {
        wasapiApiKey,
        userId: stored.userId,
        orgId: stored.orgId,
        defaultFromId: stored.defaultFromId,
      },
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const hash = hashToken(request.token, this.config.tokenHashSecret);
    // We don't know if it's an access or refresh token; clear both. If it's a
    // refresh token, also revoke its rotation family.
    const refresh = await this.store.getRefreshToken(hash);
    if (refresh) await this.store.delFamily(refresh.familyId);
    await Promise.all([this.store.delAccessToken(hash), this.store.delRefreshToken(hash)]);
  }

  // --- internal -----------------------------------------------------------

  private async issueTokens(payload: {
    clientId: string;
    scope: string[];
    encryptedApiKey: string;
    userId: number;
    orgId?: number;
    defaultFromId?: number;
    familyId: string;
  }): Promise<OAuthTokens> {
    const accessToken = generateOpaqueToken(32);
    const refreshToken = generateOpaqueToken(32);
    const accessHash = hashToken(accessToken, this.config.tokenHashSecret);
    const refreshHash = hashToken(refreshToken, this.config.tokenHashSecret);

    const accessTtl = this.config.ttls.accessToken;
    const refreshTtl = this.config.ttls.refreshToken;
    const now = nowSeconds();

    await this.store.putAccessToken(
      accessHash,
      { ...payload, expiresAt: now + accessTtl },
      accessTtl,
    );
    await this.store.putRefreshToken(
      refreshHash,
      { ...payload, expiresAt: now + refreshTtl },
      refreshTtl,
    );
    // Mark this refresh token as the family's current valid token (rotation).
    await this.store.putFamily(payload.familyId, refreshHash, refreshTtl);

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: accessTtl,
      refresh_token: refreshToken,
      scope: payload.scope.join(" "),
    };
  }
}
