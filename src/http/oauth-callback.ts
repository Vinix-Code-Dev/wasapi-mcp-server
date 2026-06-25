import type { Request, Response, RequestHandler } from "express";
import type { ServeConfig } from "../config.js";
import type { OAuthStore } from "../oauth/redis-store.js";
import type { WasapiOAuthProvider } from "../oauth/provider.js";
import { exchangeGrant } from "../oauth/wasapi-auth.js";

export interface OAuthCallbackDeps {
  provider: WasapiOAuthProvider;
  store: OAuthStore;
  config: ServeConfig;
  fetchImpl?: typeof fetch;
}

function redirectWithError(res: Response, redirectUri: string, error: string, state?: string): void {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) url.searchParams.set("state", state);
  res.redirect(302, url.toString());
}

/**
 * GET /oauth/callback — the web app sends the user back here after consent.
 *   success: ?sid=...&grant=<grant_code>
 *   denied:  ?sid=...&error=access_denied
 *
 * Steps (9)-(10): look up the pending authorization by sid, exchange the
 * backend grant for the user's Wasapi API key (server-to-server), mint the
 * MCP auth code, and 302 back to the original client redirect_uri with
 * ?code&state so Claude can complete the token exchange.
 */
export function handleOAuthCallback(deps: OAuthCallbackDeps): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
    const sid = typeof req.query.sid === "string" ? req.query.sid : undefined;
    const grant = typeof req.query.grant === "string" ? req.query.grant : undefined;
    const errorParam = typeof req.query.error === "string" ? req.query.error : undefined;

    if (!sid) {
      res.status(400).send("Solicitud inválida: falta el identificador de sesión (sid).");
      return;
    }

    const session = await deps.store.getLoginSession(sid);
    if (!session) {
      res.status(400).send("La sesión de autorización expiró o no es válida. Vuelve a intentarlo.");
      return;
    }

    // Consent denied (or any error bubbled up from the web app).
    if (errorParam) {
      await deps.store.delLoginSession(sid);
      redirectWithError(res, session.redirectUri, errorParam, session.state);
      return;
    }

    if (!grant) {
      res.status(400).send("Solicitud inválida: falta el código de autorización (grant).");
      return;
    }

    try {
      const userGrant = await exchangeGrant(grant, {
        wasapiBaseUrl: deps.config.wasapiBaseUrl,
        grantExchangeSecret: deps.config.grantExchangeSecret,
        fetchImpl: deps.fetchImpl,
      });

      const code = await deps.provider.createAuthCode(session, userGrant);
      await deps.store.delLoginSession(sid);

      const redirect = new URL(session.redirectUri);
      redirect.searchParams.set("code", code);
      if (session.state) redirect.searchParams.set("state", session.state);
      res.redirect(302, redirect.toString());
    } catch (err) {
      if (deps.config.debug) {
        process.stderr.write(`[wasapi-mcp] oauth-callback error: ${(err as Error).message}\n`);
      }
      await deps.store.delLoginSession(sid);
      redirectWithError(res, session.redirectUri, "server_error", session.state);
    }
  };
}
