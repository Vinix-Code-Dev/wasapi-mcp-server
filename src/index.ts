#!/usr/bin/env node

console.log = (...args: unknown[]) => {
  process.stderr.write(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n");
};
console.info = console.log;
console.debug = console.log;

import { readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export type DispatchResult =
  | { kind: "server" }
  | { kind: "setup"; printOnly: boolean; local: boolean; restart: boolean; targetId?: string }
  | { kind: "version" }
  | { kind: "help" }
  | { kind: "unknown"; arg: string };

function extractFlagValue(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

export function dispatch(args: string[]): DispatchResult {
  if (args.length === 0) return { kind: "server" };
  const first = args[0];
  if (first === "setup") {
    return {
      kind: "setup",
      printOnly: args.includes("--print-only"),
      local: args.includes("--local"),
      restart: args.includes("--restart"),
      targetId: extractFlagValue(args, "--target"),
    };
  }
  if (first === "--version") return { kind: "version" };
  if (first === "--help" || first === "-h") return { kind: "help" };
  return { kind: "unknown", arg: first };
}

async function readVersion(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await readFile(join(here, "..", "package.json"), "utf8"));
  return pkg.version;
}

function printHelp(): void {
  process.stdout.write(`wasapi-mcp — MCP server for Wasapi

Usage:
  wasapi-mcp                  Start the MCP server on stdio (used by Claude Desktop)
  wasapi-mcp setup            Interactive setup wizard
  wasapi-mcp setup --print-only
                              Run wizard but print the JSON instead of writing files
  wasapi-mcp setup --target claude-desktop|cursor
                              Skip the target menu and install to a specific platform
  wasapi-mcp setup --restart  Automatically restart the target app after writing config
                              (macOS only; falls back to manual hint elsewhere)
  wasapi-mcp setup --local
                              Write the local dist path instead of 'npx -y @wasapi/mcp-server'
                              (for testing before publishing)
  wasapi-mcp --version        Print version
  wasapi-mcp --help           Print this help

Environment variables:
  WASAPI_API_KEY              Required. Your Wasapi API key.
  WASAPI_FROM_ID              Optional. Default WhatsApp number ID.
  WASAPI_BASE_URL             Optional. Override SDK base URL.
  WASAPI_DEBUG                Optional. Set to 1 for stderr debug logs.
`);
}

async function main() {
  const result = dispatch(process.argv.slice(2));
  switch (result.kind) {
    case "version":
      process.stdout.write((await readVersion()) + "\n");
      return;
    case "help":
      printHelp();
      return;
    case "unknown":
      process.stderr.write(`Unknown argument: ${result.arg}\n\n`);
      printHelp();
      process.exit(1);
    case "setup": {
      const { runSetup } = await import("./setup/index.js");
      await runSetup({
        printOnly: result.printOnly,
        local: result.local,
        restart: result.restart,
        targetId: result.targetId,
      });
      return;
    }
    case "server": {
      const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
      const { buildServer } = await import("./server.js");
      const { allTools } = await import("./tools/index.js");
      const { loadConfig } = await import("./config.js");
      try {
        loadConfig();
      } catch (e) {
        process.stderr.write(`${(e as Error).message}\n`);
        process.exit(1);
      }
      const server = buildServer(allTools);
      const transport = new StdioServerTransport();
      await server.connect(transport);
      return;
    }
  }
}

function isEntryPoint(): boolean {
  try {
    if (!process.argv[1]) return false;
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${err?.message ?? err}\n`);
    process.exit(1);
  });
}
