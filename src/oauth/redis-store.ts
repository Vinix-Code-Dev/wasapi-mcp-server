import { Redis } from "ioredis";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { LoginSession, StoredAuthCode, StoredToken } from "./types.js";

const K = {
  client: (id: string) => `oauth:client:${id}`,
  login: (sid: string) => `oauth:login:${sid}`,
  authCode: (code: string) => `oauth:authcode:${code}`,
  access: (hash: string) => `oauth:access:${hash}`,
  refresh: (hash: string) => `oauth:refresh:${hash}`,
  family: (familyId: string) => `oauth:family:${familyId}`,
};

/**
 * Persistence surface the OAuth provider depends on. Extracted as an interface
 * so unit tests can supply an in-memory fake instead of a live Redis.
 */
export interface OAuthStore {
  // Dynamic client registration records.
  putClient(client: OAuthClientInformationFull, ttlSeconds: number): Promise<void>;
  getClient(clientId: string): Promise<OAuthClientInformationFull | undefined>;

  // Pending authorizations (sid -> login session).
  putLoginSession(sid: string, session: LoginSession, ttlSeconds: number): Promise<void>;
  getLoginSession(sid: string): Promise<LoginSession | undefined>;
  delLoginSession(sid: string): Promise<void>;

  // MCP authorization codes. getAuthCode peeks (for PKCE challenge lookup);
  // takeAuthCode consumes atomically (single-use at exchange time).
  putAuthCode(code: string, data: StoredAuthCode, ttlSeconds: number): Promise<void>;
  getAuthCode(code: string): Promise<StoredAuthCode | undefined>;
  takeAuthCode(code: string): Promise<StoredAuthCode | undefined>;

  // Access / refresh tokens, keyed by HMAC hash of the opaque token.
  putAccessToken(hash: string, data: StoredToken, ttlSeconds: number): Promise<void>;
  getAccessToken(hash: string): Promise<StoredToken | undefined>;
  delAccessToken(hash: string): Promise<void>;

  putRefreshToken(hash: string, data: StoredToken, ttlSeconds: number): Promise<void>;
  getRefreshToken(hash: string): Promise<StoredToken | undefined>;
  delRefreshToken(hash: string): Promise<void>;

  // Refresh-token rotation family: maps familyId -> current valid RT hash.
  // Used to detect reuse of a rotated refresh token and revoke the family.
  putFamily(familyId: string, currentRefreshHash: string, ttlSeconds: number): Promise<void>;
  getFamily(familyId: string): Promise<string | undefined>;
  delFamily(familyId: string): Promise<void>;

  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export class RedisStore implements OAuthStore {
  constructor(private readonly redis: Redis) {}

  static fromUrl(url: string): RedisStore {
    // Fail-closed: don't endlessly retry queued commands when Redis is down.
    const redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    redis.on("error", (err) => {
      process.stderr.write(`[wasapi-mcp] redis error: ${err.message}\n`);
    });
    return new RedisStore(redis);
  }

  private async putJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  private async getJson<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }

  putClient(client: OAuthClientInformationFull, ttlSeconds: number): Promise<void> {
    return this.putJson(K.client(client.client_id), client, ttlSeconds);
  }
  getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.getJson<OAuthClientInformationFull>(K.client(clientId));
  }

  putLoginSession(sid: string, session: LoginSession, ttlSeconds: number): Promise<void> {
    return this.putJson(K.login(sid), session, ttlSeconds);
  }
  getLoginSession(sid: string): Promise<LoginSession | undefined> {
    return this.getJson<LoginSession>(K.login(sid));
  }
  async delLoginSession(sid: string): Promise<void> {
    await this.redis.del(K.login(sid));
  }

  putAuthCode(code: string, data: StoredAuthCode, ttlSeconds: number): Promise<void> {
    return this.putJson(K.authCode(code), data, ttlSeconds);
  }
  getAuthCode(code: string): Promise<StoredAuthCode | undefined> {
    return this.getJson<StoredAuthCode>(K.authCode(code));
  }
  async takeAuthCode(code: string): Promise<StoredAuthCode | undefined> {
    // GETDEL makes the code single-use atomically (no race between read & delete).
    const raw = await this.redis.getdel(K.authCode(code));
    return raw ? (JSON.parse(raw) as StoredAuthCode) : undefined;
  }

  putAccessToken(hash: string, data: StoredToken, ttlSeconds: number): Promise<void> {
    return this.putJson(K.access(hash), data, ttlSeconds);
  }
  getAccessToken(hash: string): Promise<StoredToken | undefined> {
    return this.getJson<StoredToken>(K.access(hash));
  }
  async delAccessToken(hash: string): Promise<void> {
    await this.redis.del(K.access(hash));
  }

  putRefreshToken(hash: string, data: StoredToken, ttlSeconds: number): Promise<void> {
    return this.putJson(K.refresh(hash), data, ttlSeconds);
  }
  getRefreshToken(hash: string): Promise<StoredToken | undefined> {
    return this.getJson<StoredToken>(K.refresh(hash));
  }
  async delRefreshToken(hash: string): Promise<void> {
    await this.redis.del(K.refresh(hash));
  }

  async putFamily(familyId: string, currentRefreshHash: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(K.family(familyId), currentRefreshHash, "EX", ttlSeconds);
  }
  async getFamily(familyId: string): Promise<string | undefined> {
    return (await this.redis.get(K.family(familyId))) ?? undefined;
  }
  async delFamily(familyId: string): Promise<void> {
    await this.redis.del(K.family(familyId));
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
