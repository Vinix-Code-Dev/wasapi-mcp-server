import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthStore } from "./redis-store.js";

/**
 * Dynamic Client Registration store backed by Redis. The MCP SDK's register
 * handler generates the client_id/client_secret and passes a fully-populated
 * client to registerClient(); we persist it (TTL-bound) and hand it back.
 */
export class RedisClientsStore implements OAuthRegisteredClientsStore {
  constructor(
    private readonly store: OAuthStore,
    private readonly ttlSeconds: number,
  ) {}

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.store.getClient(clientId);
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
  ): Promise<OAuthClientInformationFull> {
    // At runtime the SDK has already populated client_id/client_id_issued_at.
    const full = client as OAuthClientInformationFull;
    await this.store.putClient(full, this.ttlSeconds);
    return full;
  }
}
