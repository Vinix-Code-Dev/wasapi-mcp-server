# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MCP (Model Context Protocol) server that exposes the Wasapi WhatsApp Business API (via `@wasapi/js-sdk`) as MCP tools, so Claude/Cursor/etc. can manage contacts, send messages, and query conversations in natural language. Distributed as an npm package (`@wasapi/mcp-server`, bin `wasapi-mcp`) and also packaged as a `.mcpb` Claude Desktop extension.

## Commands

```bash
npm run dev               # run the server directly with tsx (stdio transport)
npm run build              # tsc -p tsconfig.build.json -> dist/
npm run typecheck          # tsc --noEmit
npm test                   # vitest run (unit tests, excludes tests/integration)
npm run test:watch         # vitest watch mode
npm run test:integration   # vitest run against tests/integration (hits real/mocked HTTP)
npm run package:dxt        # build the .mcpb Claude Desktop extension via scripts/build-dxt.mjs
```

Run a single test file: `npx vitest run tests/unit/tools/contacts-list.test.ts`.

The CLI itself supports `wasapi-mcp setup` (interactive config wizard for Claude Desktop/Cursor), `wasapi-mcp --version`, `wasapi-mcp --help`; with no args it starts the stdio MCP server. See `src/index.ts` `dispatch()`.

## Architecture

**Entry/dispatch (`src/index.ts`)**: parses `process.argv` into a `DispatchResult` (pure function `dispatch`, unit-testable) and lazily imports the right module — server, setup wizard, version, help. `console.log/info/debug` are redirected to stderr at the top of the file because stdout is reserved for the MCP stdio protocol.

**Server (`src/server.ts`)**: `buildServer(tools)` builds an `@modelcontextprotocol/sdk` `Server`, registers `ListTools`/`CallTool` handlers from an array of `ToolDefinition`s, and converts each Zod schema to JSON Schema via `zod-to-json-schema`. Tool list responses also attach `annotations` (title + readOnly/destructive hints) from `src/lib/tool-annotations.ts` — required for the Claude Connectors Directory listing.

**Tool definition pattern**: every tool in `src/tools/**` exports a `ToolDefinition` (`src/lib/register-tool.ts`):
```ts
{ name, description, schema: ZodType, handler: (args) => Promise<unknown> }
```
`wrapHandler` does the actual dispatch glue: validates args against the Zod schema (returns an MCP validation error on failure), calls the handler, JSON-stringifies the result as `content`, and on thrown errors maps them through `mapError` (`src/lib/errors.ts`) into a category (`auth`/`not_found`/`validation`/`rate_limit`/`server`/`network`/`unknown`) with a Spanish-language user-facing message. All tool descriptions/messages are in **Spanish** — keep new tools consistent with this.

All tools are aggregated in `src/tools/index.ts` as `allTools`; adding a new tool means creating the file under the appropriate `src/tools/<domain>/` subfolder, adding it to `allTools`, and adding an entry to `TOOL_ANNOTATIONS` in `src/lib/tool-annotations.ts` (title + `R()`/`W()` for read-only vs. destructive).

**Wasapi client (`src/wasapi.ts`)**: `getClient()` lazily constructs and caches a singleton `WasapiClient` from `@wasapi/js-sdk`, configured from `loadConfig()`. `__resetClientForTests()` resets the cache between tests.

**Config (`src/config.ts`)**: validates env vars with Zod (`WASAPI_API_KEY` required, `WASAPI_FROM_ID`/`WASAPI_BASE_URL`/`WASAPI_DEBUG` optional). `loadConfig()` throws with a descriptive message if `WASAPI_API_KEY` is missing — this is called both at server startup (`src/index.ts`) and lazily inside `getClient()`.

**Setup wizard (`src/setup/`)**: interactive flow used by `wasapi-mcp setup` — opens the browser to grab an API key (`browser.ts`), validates it live against the API (`validate-key.ts`), detects the MCP client target (`targets.ts`), writes its config file (`config-write.ts`), and optionally restarts the app (`restart.ts`). `index.ts` orchestrates these; `prompt.ts` handles CLI prompting. Each piece is unit-tested independently in `tests/unit/setup-*.test.ts`.

## Conventions worth knowing

- Pure/testable logic is pulled out of side-effecting code wherever feasible (e.g. `dispatch()`, `buildToolList()`) specifically so it can be unit-tested without spinning up the real server/CLI.
- Tool handlers stay thin: validate via Zod, call into `getClient()`/`@wasapi/js-sdk`, return raw data — error mapping and response formatting are handled centrally by `wrapHandler`, not per-tool.
- Some SDK surfaces are stubs that throw (e.g. campaign create/update/delete are intentionally not implemented — see the `NOTE` in `src/tools/index.ts`); don't wire up tools for unimplemented SDK methods.
- `tests/contracts/sdk-shapes.test.ts` guards against `@wasapi/js-sdk` shape drift — update it if the SDK contract changes.
- Integration tests (`tests/integration/`) are config-isolated from unit tests via `vitest.integration.config.ts` and must be run explicitly with `npm run test:integration`.
