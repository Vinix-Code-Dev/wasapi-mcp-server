import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { wrapHandler, type ToolDefinition } from "./lib/register-tool.js";
import { getAnnotations } from "./lib/tool-annotations.js";

// Report the real package version in the MCP handshake (kept in sync with
// package.json / the manifest — directory reviewers check this consistency).
function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    return JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// Exported so it can be unit-tested directly (pure transform).
export function buildToolList(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.schema) as any,
    annotations: getAnnotations(t.name),
  }));
}

export function buildServer(tools: ToolDefinition[]): Server {
  const server = new Server(
    { name: "wasapi-mcp", version: packageVersion() },
    { capabilities: { tools: {} } },
  );

  const handlers = new Map(tools.map((t) => [t.name, wrapHandler(t.schema, t.handler)]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: buildToolList(tools),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const fn = handlers.get(req.params.name);
    if (!fn) {
      return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
    }
    return fn(req.params.arguments ?? {});
  });

  return server;
}
