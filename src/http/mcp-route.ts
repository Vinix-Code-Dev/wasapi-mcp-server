import type { Request, Response, RequestHandler } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ToolDefinition } from "../lib/register-tool.js";
import type { ServeConfig } from "../config.js";
import { runWithContext } from "./request-context.js";
import type { RequestContext } from "../oauth/types.js";

const JSONRPC_METHOD_NOT_ALLOWED = {
  jsonrpc: "2.0" as const,
  error: { code: -32000, message: "Method not allowed." },
  id: null,
};

interface McpServerLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect: (transport: any) => Promise<void>;
  close: () => Promise<void>;
}

export interface McpRouteDeps {
  buildServer: (tools: ToolDefinition[]) => McpServerLike;
  tools: ToolDefinition[];
  config: ServeConfig;
}

function contextFromAuth(req: Request, config: ServeConfig): RequestContext | undefined {
  const extra = req.auth?.extra as
    | { wasapiApiKey?: string; userId?: number; orgId?: number; defaultFromId?: number }
    | undefined;
  if (!extra?.wasapiApiKey || typeof extra.userId !== "number") return undefined;
  return {
    wasapiApiKey: extra.wasapiApiKey,
    userId: extra.userId,
    orgId: extra.orgId,
    defaultFromId: extra.defaultFromId,
    baseUrl: config.wasapiBaseUrl,
  };
}

/**
 * Handles POST /mcp using a fresh stateless StreamableHTTP transport per
 * request (sessionIdGenerator: undefined). Each request already carries its
 * own bearer token, so binding one MCP session to one API key across refreshes
 * is avoided. The whole request runs inside the per-user ALS context, so the
 * tools resolve getClient() to that user's Wasapi key. GET/DELETE are not
 * supported in stateless mode → 405.
 */
export function handleMcp(deps: McpRouteDeps): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
    if (req.method !== "POST") {
      res.status(405).json(JSONRPC_METHOD_NOT_ALLOWED);
      return;
    }

    const ctx = contextFromAuth(req, deps.config);
    if (!ctx) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "No autenticado." },
        id: null,
      });
      return;
    }

    await runWithContext(ctx, async () => {
      const server = deps.buildServer(deps.tools);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
  };
}
