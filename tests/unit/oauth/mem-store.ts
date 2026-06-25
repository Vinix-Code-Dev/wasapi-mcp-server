import type { OAuthStore } from "../../../src/oauth/redis-store.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { LoginSession, StoredAuthCode, StoredToken } from "../../../src/oauth/types.js";

/** In-memory OAuthStore for unit tests (no TTL enforcement). */
export class MemStore implements OAuthStore {
  clients = new Map<string, OAuthClientInformationFull>();
  logins = new Map<string, LoginSession>();
  codes = new Map<string, StoredAuthCode>();
  access = new Map<string, StoredToken>();
  refresh = new Map<string, StoredToken>();
  families = new Map<string, string>();

  async putClient(c: OAuthClientInformationFull) { this.clients.set(c.client_id, c); }
  async getClient(id: string) { return this.clients.get(id); }

  async putLoginSession(sid: string, s: LoginSession) { this.logins.set(sid, s); }
  async getLoginSession(sid: string) { return this.logins.get(sid); }
  async delLoginSession(sid: string) { this.logins.delete(sid); }

  async putAuthCode(code: string, d: StoredAuthCode) { this.codes.set(code, d); }
  async getAuthCode(code: string) { return this.codes.get(code); }
  async takeAuthCode(code: string) {
    const v = this.codes.get(code);
    this.codes.delete(code);
    return v;
  }

  async putAccessToken(h: string, d: StoredToken) { this.access.set(h, d); }
  async getAccessToken(h: string) { return this.access.get(h); }
  async delAccessToken(h: string) { this.access.delete(h); }

  async putRefreshToken(h: string, d: StoredToken) { this.refresh.set(h, d); }
  async getRefreshToken(h: string) { return this.refresh.get(h); }
  async delRefreshToken(h: string) { this.refresh.delete(h); }

  async putFamily(id: string, h: string) { this.families.set(id, h); }
  async getFamily(id: string) { return this.families.get(id); }
  async delFamily(id: string) { this.families.delete(id); }

  async ping() { return true; }
  async close() { /* no-op */ }
}
