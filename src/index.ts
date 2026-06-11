#!/usr/bin/env node
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
