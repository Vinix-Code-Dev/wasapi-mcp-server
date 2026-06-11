#!/usr/bin/env node

// Redirect console.log to stderr BEFORE importing anything else.
// The Wasapi SDK and potentially other deps log to stdout, which corrupts
// the MCP JSON-RPC stream on stdio transport. stdout must stay clean.
console.log = (...args: unknown[]) => {
  process.stderr.write(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n");
};
console.info = console.log;
console.debug = console.log;

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";
import { allTools } from "./tools/index.js";
import { loadConfig } from "./config.js";

async function main() {
  try {
    loadConfig();
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exit(1);
  }
  const server = buildServer(allTools);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err?.message ?? err}\n`);
  process.exit(1);
});
