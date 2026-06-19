import type { UserGrant } from "./types.js";

/** Header carrying the proxy↔backend shared secret on the exchange-grant call. */
export const GRANT_SECRET_HEADER = "x-mcp-grant-secret";

export interface ExchangeGrantDeps {
  wasapiBaseUrl: string; // e.g. https://api-ws.wasapi.io/api/
  grantExchangeSecret: string;
  fetchImpl?: typeof fetch; // injectable for tests
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/**
 * Server-to-server exchange: hands the single-use grant_code (minted by the
 * backend during consent) to the backend, authenticated with the shared
 * secret, and receives the user's Wasapi API key + identity. The backend
 * deletes the grant on read, so this only succeeds once per grant.
 */
export async function exchangeGrant(grantCode: string, deps: ExchangeGrantDeps): Promise<UserGrant> {
  const doFetch = deps.fetchImpl ?? fetch;
  const url = joinUrl(deps.wasapiBaseUrl, "v3/oauth/mcp/exchange-grant");

  const res = await doFetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      [GRANT_SECRET_HEADER]: deps.grantExchangeSecret,
    },
    body: JSON.stringify({ grant_code: grantCode }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    throw new Error(`exchange-grant failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  const body = (await res.json()) as {
    wasapi_api_key?: string;
    user_id?: number;
    org_id?: number | null;
    default_from_id?: number | null;
  };

  if (!body.wasapi_api_key || typeof body.user_id !== "number") {
    throw new Error("exchange-grant returned an invalid payload");
  }

  return {
    wasapiApiKey: body.wasapi_api_key,
    userId: body.user_id,
    orgId: body.org_id ?? undefined,
    defaultFromId: body.default_from_id ?? undefined,
  };
}
