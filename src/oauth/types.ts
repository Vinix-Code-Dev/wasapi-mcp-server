// Shared types for the remote OAuth serve mode.

/**
 * Per-request context propagated through AsyncLocalStorage in serve mode.
 * Carries the authenticated user's Wasapi API key (decrypted) and identity
 * so tool handlers (via getClient()) and resolveFromId() can act as that user
 * without any global/singleton state.
 */
export interface RequestContext {
  wasapiApiKey: string;
  userId: number;
  orgId?: number;
  defaultFromId?: number;
  baseUrl: string;
}

/**
 * A pending OAuth authorization. Created in provider.authorize(), keyed by an
 * opaque `sid` that travels to the web app and back via the callback. TTL-bound.
 */
export interface LoginSession {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  scope: string[];
}

/**
 * Payload returned by the backend's exchange-grant endpoint and the identity
 * resolved for a user during consent. Stored (key encrypted) inside auth codes
 * and access/refresh tokens.
 */
export interface UserGrant {
  wasapiApiKey: string;
  userId: number;
  orgId?: number;
  defaultFromId?: number;
}

/**
 * MCP authorization code, created in oauth-callback.ts after the grant
 * exchange and consumed (single-use) by exchangeAuthorizationCode.
 * The Wasapi API key is stored encrypted at-rest.
 */
export interface StoredAuthCode {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string[];
  encryptedApiKey: string;
  userId: number;
  orgId?: number;
  defaultFromId?: number;
}

/**
 * Stored access/refresh token payload. Tokens themselves are never stored in
 * plaintext — only an HMAC hash of the opaque token is used as the Redis key.
 */
export interface StoredToken {
  clientId: string;
  scope: string[];
  encryptedApiKey: string;
  userId: number;
  orgId?: number;
  defaultFromId?: number;
  /** Identifies the refresh-token rotation family for reuse detection. */
  familyId: string;
  expiresAt: number; // seconds since epoch
}
