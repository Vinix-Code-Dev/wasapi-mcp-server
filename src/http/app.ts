import express, { type Express } from "express";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { ServeConfig } from "../config.js";
import type { OAuthStore } from "../oauth/redis-store.js";
import { WasapiOAuthProvider } from "../oauth/provider.js";
import { buildServer } from "../server.js";
import { allTools } from "../tools/index.js";
import { handleOAuthCallback } from "./oauth-callback.js";
import { handleMcp } from "./mcp-route.js";
import { handleHealthz, handleReadyz } from "./health.js";

export interface BuildHttpAppDeps {
  config: ServeConfig;
  store: OAuthStore;
  fetchImpl?: typeof fetch; // injectable for tests (grant exchange)
}

/**
 * Wires the Express app for serve mode without listening (so it's testable
 * with supertest). Route order matters: health + OAuth metadata/endpoints +
 * callback are public; only /mcp sits behind requireBearerAuth.
 */
export function buildHttpApp(deps: BuildHttpAppDeps): Express {
  const { config, store } = deps;
  const provider = new WasapiOAuthProvider({ store, config });

  const app = express();
  // Behind a TLS-terminating LB/ingress — trust it so generated redirect URIs
  // and the issuer come out as https://mcp.wasapi.io (must match well-known).
  app.set("trust proxy", 1);
  app.use(express.json());

  // Health (public, no auth, before the bearer gate).
  app.get("/healthz", handleHealthz());
  app.get("/readyz", handleReadyz(store));

  // OAuth 2.1 AS + protected-resource metadata, DCR (/register), /authorize,
  // /token, /revoke. Must be installed at the app root.
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(config.issuerUrl),
      baseUrl: new URL(config.publicUrl),
      resourceServerUrl: new URL(config.publicUrl),
      scopesSupported: ["wasapi"],
      resourceName: "Wasapi",
    }),
  );

  // Our custom callback from the web app's consent screen (public).
  app.get("/oauth/callback", handleOAuthCallback({ provider, store, config, fetchImpl: deps.fetchImpl }));

  // Everything below requires a valid bearer token.
  const resourceMetadataUrl = `${config.publicUrl}/.well-known/oauth-protected-resource`;
  app.use(requireBearerAuth({ verifier: provider, requiredScopes: ["wasapi"], resourceMetadataUrl }));
  app.all("/mcp", handleMcp({ buildServer, tools: allTools, config }));

  return app;
}
