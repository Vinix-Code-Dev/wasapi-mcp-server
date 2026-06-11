# Wasapi MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a distributable MCP server (`@wasapi/mcp-server`) exposing 13 Wasapi tools (contacts + WhatsApp) to Claude via stdio.

**Architecture:** SDK-first — every tool is a thin wrapper over `@wasapi/js-sdk`. A `register-tool` helper standardizes zod validation, error mapping, and MCP response shaping. One `WasapiClient` singleton lives in `src/wasapi.ts`. Config from env vars, validated at startup.

**Tech Stack:** Node.js ≥20, TypeScript, `@modelcontextprotocol/sdk`, `@wasapi/js-sdk`, `zod`, `vitest`.

**Spec:** `docs/superpowers/specs/2026-06-10-wasapi-mcp-design.md`

> **SDK surface caveat:** The exact method names on `@wasapi/js-sdk` (e.g. `client.contacts.list()` vs `.getAll()`) are not pinned in this plan. Task 4 includes an SDK discovery step that locks them down. If a tool task uses a method name that doesn't match the SDK, adjust the call in the handler — the test setup (mocked client) doesn't depend on real names.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `.gitignore`, `.npmignore`, `README.md`

- [ ] **Step 1: Initialize git and npm**

```bash
cd /Users/nova/VINIX/mcp-wasapi
git init
npm init -y
```

- [ ] **Step 2: Install runtime deps**

```bash
npm install @modelcontextprotocol/sdk @wasapi/js-sdk zod
```

- [ ] **Step 3: Install dev deps**

```bash
npm install -D typescript @types/node vitest tsx
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 5: Write `tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts"]
}
```

- [ ] **Step 6: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integration/**"],
  },
});
```

- [ ] **Step 7: Write `.gitignore`**

```
node_modules
dist
.env
.env.*
*.log
.DS_Store
```

- [ ] **Step 8: Write `.npmignore`**

```
src
tests
docs
tsconfig*.json
vitest.config.ts
.github
```

- [ ] **Step 9: Update `package.json`**

Set `name` to `@wasapi/mcp-server`, `version` to `0.1.0`, `main` to `dist/index.js`, `bin` to `{ "wasapi-mcp": "dist/index.js" }`, `type` to `module`, `files` to `["dist", "README.md"]`. Add scripts:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run tests/integration/",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 10: Create empty README placeholder**

```bash
echo "# @wasapi/mcp-server" > README.md
```

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "chore: project scaffold"
```

---

## Task 2: Config module

**Files:**
- Create: `src/config.ts`
- Test: `tests/unit/config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.WASAPI_API_KEY;
    delete process.env.WASAPI_FROM_ID;
    delete process.env.WASAPI_BASE_URL;
    delete process.env.WASAPI_DEBUG;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when WASAPI_API_KEY is missing", () => {
    expect(() => loadConfig()).toThrow(/WASAPI_API_KEY/);
  });

  it("loads minimal config with only API key", () => {
    process.env.WASAPI_API_KEY = "k_test";
    const c = loadConfig();
    expect(c.apiKey).toBe("k_test");
    expect(c.fromId).toBeUndefined();
    expect(c.debug).toBe(false);
  });

  it("parses fromId as number", () => {
    process.env.WASAPI_API_KEY = "k_test";
    process.env.WASAPI_FROM_ID = "12345";
    expect(loadConfig().fromId).toBe(12345);
  });

  it("enables debug when WASAPI_DEBUG=1", () => {
    process.env.WASAPI_API_KEY = "k";
    process.env.WASAPI_DEBUG = "1";
    expect(loadConfig().debug).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npm test -- tests/unit/config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/config.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  WASAPI_API_KEY: z.string().min(1, "WASAPI_API_KEY is required. Get yours at https://app.wasapi.io/"),
  WASAPI_FROM_ID: z.string().optional(),
  WASAPI_BASE_URL: z.string().url().optional(),
  WASAPI_DEBUG: z.string().optional(),
});

export interface Config {
  apiKey: string;
  fromId?: number;
  baseUrl?: string;
  debug: boolean;
}

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid configuration: ${msg}`);
  }
  const env = parsed.data;
  return {
    apiKey: env.WASAPI_API_KEY,
    fromId: env.WASAPI_FROM_ID ? Number(env.WASAPI_FROM_ID) : undefined,
    baseUrl: env.WASAPI_BASE_URL,
    debug: env.WASAPI_DEBUG === "1",
  };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npm test -- tests/unit/config.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/unit/config.test.ts
git commit -m "feat: env var config with zod validation"
```

---

## Task 3: Error mapper

**Files:**
- Create: `src/lib/errors.ts`
- Test: `tests/unit/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/errors.test.ts
import { describe, it, expect } from "vitest";
import { mapError } from "../../src/lib/errors.js";

const axiosErr = (status: number, data?: unknown, headers?: Record<string, string>) => ({
  isAxiosError: true,
  response: { status, data, headers: headers ?? {} },
  message: "Request failed",
});

describe("mapError", () => {
  it("maps 401 to auth", () => {
    expect(mapError(axiosErr(401)).category).toBe("auth");
  });
  it("maps 403 to auth", () => {
    expect(mapError(axiosErr(403)).category).toBe("auth");
  });
  it("maps 404 to not_found with detail", () => {
    const r = mapError(axiosErr(404, { message: "contact x" }));
    expect(r.category).toBe("not_found");
    expect(r.message).toContain("contact x");
  });
  it("maps 422 to validation", () => {
    expect(mapError(axiosErr(422, { errors: { phone: "required" } })).category).toBe("validation");
  });
  it("maps 429 to rate_limit and includes retry-after", () => {
    const r = mapError(axiosErr(429, undefined, { "retry-after": "30" }));
    expect(r.category).toBe("rate_limit");
    expect(r.message).toContain("30");
  });
  it("maps 500 to server", () => {
    expect(mapError(axiosErr(500)).category).toBe("server");
  });
  it("maps network errors to network", () => {
    expect(mapError({ isAxiosError: true, code: "ECONNREFUSED", message: "x" }).category).toBe("network");
  });
  it("maps unknown to unknown", () => {
    expect(mapError(new Error("oops")).category).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/errors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/errors.ts`**

```ts
export type ErrorCategory =
  | "auth"
  | "not_found"
  | "validation"
  | "rate_limit"
  | "server"
  | "network"
  | "unknown";

export interface MappedError {
  category: ErrorCategory;
  message: string;
}

interface MaybeAxios {
  isAxiosError?: boolean;
  code?: string;
  message?: string;
  response?: { status?: number; data?: any; headers?: Record<string, string> };
}

export function mapError(err: unknown): MappedError {
  const e = err as MaybeAxios;
  if (e?.isAxiosError) {
    const status = e.response?.status;
    const data = e.response?.data;
    if (status === 401 || status === 403) {
      return { category: "auth", message: "API key inválida o sin permisos para este recurso" };
    }
    if (status === 404) {
      const detail = data?.message ?? data?.error ?? "sin detalle";
      return { category: "not_found", message: `Recurso no encontrado: ${detail}` };
    }
    if (status === 422) {
      const errors = data?.errors ?? data?.message ?? "datos inválidos";
      return { category: "validation", message: `Datos inválidos: ${JSON.stringify(errors)}` };
    }
    if (status === 429) {
      const retry = e.response?.headers?.["retry-after"] ?? "?";
      return { category: "rate_limit", message: `Rate limit alcanzado. Reintentar en ${retry}s` };
    }
    if (status && status >= 500) {
      return { category: "server", message: `Error del servidor Wasapi: ${data?.message ?? e.message ?? "5xx"}. Reintentable.` };
    }
    if (!e.response) {
      return { category: "network", message: "No se pudo contactar a Wasapi" };
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  return { category: "unknown", message: msg };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npm test -- tests/unit/errors.test.ts`
Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors.ts tests/unit/errors.test.ts
git commit -m "feat: SDK error to MCP error mapper"
```

---

## Task 4: Wasapi client singleton + SDK surface discovery

**Files:**
- Create: `src/wasapi.ts`
- Create: `docs/sdk-surface.md` (reference doc for the rest of the plan)

- [ ] **Step 1: Discover the SDK surface**

Run a quick inspection of the installed SDK and write down the exact exports the plan needs:

```bash
node -e "import('@wasapi/js-sdk').then(m => console.log(Object.keys(m)))"
```

Open `node_modules/@wasapi/js-sdk/dist/` (or whatever the `main` field points to) and inspect the `WasapiClient` class. Note down for each module the actual method names. Save the findings to `docs/sdk-surface.md` with this structure:

```markdown
# SDK Surface (verified)

## Init
- `new WasapiClient(apiKey)` or `new WasapiClient({ apiKey, from_id, baseURL })`

## contacts
- `client.contacts.<methodName>(...)` — describe args and return shape

## whatsapp
- `client.whatsapp.<methodName>(...)` — describe args and return shape

## labels (used by contacts.addLabel)
- `client.labels.<methodName>(...)` — describe
```

This document is the source of truth for the names used in Tasks 7–17. If a name in a later task disagrees with this doc, the doc wins.

- [ ] **Step 2: Implement `src/wasapi.ts`**

```ts
import { WasapiClient } from "@wasapi/js-sdk";
import { loadConfig, type Config } from "./config.js";

let cached: WasapiClient | null = null;

export function getClient(): WasapiClient {
  if (cached) return cached;
  const cfg = loadConfig();
  cached = new WasapiClient({
    apiKey: cfg.apiKey,
    from_id: cfg.fromId,
    ...(cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
  } as any);
  return cached;
}

export function __resetClientForTests() {
  cached = null;
}
```

If the SDK constructor signature differs from what's documented above (per Step 1 findings), adjust this file accordingly. The rest of the plan only depends on `getClient()` returning some object whose methods we call.

- [ ] **Step 3: Smoke test**

```ts
// tests/unit/wasapi.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { __resetClientForTests, getClient } from "../../src/wasapi.js";

describe("getClient", () => {
  beforeEach(() => {
    __resetClientForTests();
    process.env.WASAPI_API_KEY = "k";
  });

  it("returns a singleton", () => {
    const a = getClient();
    const b = getClient();
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/wasapi.test.ts`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add src/wasapi.ts tests/unit/wasapi.test.ts docs/sdk-surface.md
git commit -m "feat: WasapiClient singleton + SDK surface notes"
```

---

## Task 5: register-tool helper

**Files:**
- Create: `src/lib/register-tool.ts`
- Test: `tests/unit/register-tool.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/register-tool.test.ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { wrapHandler } from "../../src/lib/register-tool.js";

describe("wrapHandler", () => {
  const schema = z.object({ name: z.string() });

  it("returns success content on resolved handler", async () => {
    const handler = wrapHandler(schema, async (args) => ({ greeting: `hi ${args.name}` }));
    const res = await handler({ name: "world" });
    expect(res.isError).toBeFalsy();
    expect(res.content[0].type).toBe("text");
    expect(JSON.parse(res.content[0].text)).toEqual({ greeting: "hi world" });
  });

  it("returns validation error for bad args", async () => {
    const handler = wrapHandler(schema, async () => ({}));
    const res = await handler({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/name/i);
  });

  it("maps thrown SDK errors", async () => {
    const handler = wrapHandler(schema, async () => {
      throw { isAxiosError: true, response: { status: 401 } };
    });
    const res = await handler({ name: "x" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/API key/);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/register-tool.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/register-tool.ts`**

```ts
import { z, ZodType } from "zod";
import { mapError } from "./errors.js";

export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function wrapHandler<S extends ZodType>(
  schema: S,
  handler: (args: z.infer<S>) => Promise<unknown>,
): (rawArgs: unknown) => Promise<ToolResponse> {
  return async (rawArgs) => {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      return { content: [{ type: "text", text: `Validation error: ${msg}` }], isError: true };
    }
    try {
      const result = await handler(parsed.data);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const m = mapError(err);
      if (process.env.WASAPI_DEBUG === "1") {
        process.stderr.write(`[wasapi-mcp] ${m.category}: ${m.message}\n`);
      }
      return { content: [{ type: "text", text: m.message }], isError: true };
    }
  };
}

export interface ToolDefinition<S extends ZodType = ZodType> {
  name: string;
  description: string;
  schema: S;
  handler: (args: z.infer<S>) => Promise<unknown>;
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/register-tool.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/register-tool.ts tests/unit/register-tool.test.ts
git commit -m "feat: wrapHandler for zod validation + error mapping"
```

---

## Task 6: Server bootstrap

**Files:**
- Create: `src/server.ts`, `src/index.ts`, `src/tools/index.ts`
- Test: `tests/unit/server.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server.test.ts
import { describe, it, expect } from "vitest";
import { buildServer } from "../../src/server.js";

describe("buildServer", () => {
  it("registers all tools without throwing", async () => {
    process.env.WASAPI_API_KEY = "k";
    const server = buildServer([
      {
        name: "ping",
        description: "ping",
        schema: (await import("zod")).z.object({}),
        handler: async () => ({ ok: true }),
      },
    ]);
    expect(server).toBeDefined();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/server.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/server.ts`**

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { wrapHandler, type ToolDefinition } from "./lib/register-tool.js";

export function buildServer(tools: ToolDefinition[]): Server {
  const server = new Server(
    { name: "wasapi-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  const handlers = new Map(tools.map((t) => [t.name, wrapHandler(t.schema, t.handler)]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.schema) as any,
    })),
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
```

- [ ] **Step 4: Install zod-to-json-schema**

```bash
npm install zod-to-json-schema
```

- [ ] **Step 5: Implement `src/tools/index.ts` (empty aggregator for now)**

```ts
import type { ToolDefinition } from "../lib/register-tool.js";

export const allTools: ToolDefinition[] = [];
```

- [ ] **Step 6: Implement `src/index.ts`**

```ts
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
```

- [ ] **Step 7: Run server test, expect pass**

Run: `npm test -- tests/unit/server.test.ts && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/ tests/ package.json package-lock.json
git commit -m "feat: MCP server bootstrap with stdio transport"
```

---

## Task 7: Tool — `list_contacts`

**Files:**
- Create: `src/tools/contacts/list.ts`
- Test: `tests/unit/tools/contacts-list.test.ts`
- Modify: `src/tools/index.ts`

> **Pattern note (applies to Tasks 7–17):** every tool test mocks `getClient`. The structure is the same: arrange mock → call wrapped handler → assert serialized output OR isError. Method names like `client.contacts.list` are best-guess based on README docs; cross-check against `docs/sdk-surface.md` from Task 4.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/tools/contacts-list.test.ts
import { describe, it, expect, vi } from "vitest";
import { listContactsTool } from "../../../src/tools/contacts/list.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({
    contacts: { list: vi.fn().mockResolvedValue({ data: [{ id: 1 }], page: 1 }) },
  }),
}));

describe("list_contacts", () => {
  it("returns serialized contacts on success", async () => {
    const handler = wrapHandler(listContactsTool.schema, listContactsTool.handler);
    const res = await handler({ page: 1, per_page: 10 });
    expect(res.isError).toBeFalsy();
    const body = JSON.parse(res.content[0].text);
    expect(body.data[0].id).toBe(1);
  });

  it("works with no args", async () => {
    const handler = wrapHandler(listContactsTool.schema, listContactsTool.handler);
    const res = await handler({});
    expect(res.isError).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/tools/contacts-list.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/tools/contacts/list.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(200).optional(),
  search: z.string().optional(),
});

export const listContactsTool: ToolDefinition<typeof schema> = {
  name: "list_contacts",
  description: "Lista paginada de contactos de la cuenta Wasapi.",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await client.contacts.list(args);
  },
};
```

- [ ] **Step 4: Register in `src/tools/index.ts`**

```ts
import type { ToolDefinition } from "../lib/register-tool.js";
import { listContactsTool } from "./contacts/list.js";

export const allTools: ToolDefinition[] = [
  listContactsTool,
];
```

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add src/tools/contacts/list.ts src/tools/index.ts tests/unit/tools/contacts-list.test.ts
git commit -m "feat(tools): list_contacts"
```

---

## Task 8: Tool — `get_contact`

**Files:**
- Create: `src/tools/contacts/get.ts`, `tests/unit/tools/contacts-get.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { getContactTool } from "../../../src/tools/contacts/get.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { get: vi.fn().mockResolvedValue({ id: 42, phone: "+57..." }) } }),
}));

describe("get_contact", () => {
  it("returns contact by id", async () => {
    const h = wrapHandler(getContactTool.schema, getContactTool.handler);
    const res = await h({ contact_id: 42 });
    const body = JSON.parse(res.content[0].text);
    expect(body.id).toBe(42);
  });

  it("rejects missing contact_id", async () => {
    const h = wrapHandler(getContactTool.schema, getContactTool.handler);
    const res = await h({});
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/tools/contacts-get.test.ts`

- [ ] **Step 3: Implement `src/tools/contacts/get.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  contact_id: z.union([z.number().int().positive(), z.string().min(1)]),
});

export const getContactTool: ToolDefinition<typeof schema> = {
  name: "get_contact",
  description: "Obtiene un contacto por su ID.",
  schema,
  handler: async ({ contact_id }) => {
    const client = getClient();
    return await client.contacts.get(contact_id);
  },
};
```

- [ ] **Step 4: Register in `src/tools/index.ts`**

Add `import { getContactTool } from "./contacts/get.js";` and append to `allTools` array.

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`

- [ ] **Step 6: Commit**

```bash
git add src/tools/contacts/get.ts src/tools/index.ts tests/unit/tools/contacts-get.test.ts
git commit -m "feat(tools): get_contact"
```

---

## Task 9: Tool — `create_contact`

**Files:**
- Create: `src/tools/contacts/create.ts`, `tests/unit/tools/contacts-create.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { createContactTool } from "../../../src/tools/contacts/create.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const createMock = vi.fn().mockResolvedValue({ id: 1 });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { create: createMock } }),
}));

describe("create_contact", () => {
  it("creates with phone only", async () => {
    const h = wrapHandler(createContactTool.schema, createContactTool.handler);
    const res = await h({ phone: "+573001234567" });
    expect(res.isError).toBeFalsy();
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ phone: "+573001234567" }));
  });

  it("rejects missing phone", async () => {
    const h = wrapHandler(createContactTool.schema, createContactTool.handler);
    const res = await h({});
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/tools/contacts/create.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  phone: z.string().regex(/^\+?\d{7,15}$/, "phone must be in E.164-like format"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

export const createContactTool: ToolDefinition<typeof schema> = {
  name: "create_contact",
  description: "Crea un nuevo contacto en Wasapi.",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await client.contacts.create(args);
  },
};
```

- [ ] **Step 4: Register and test**

Add import + entry in `src/tools/index.ts`. Run `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/tools/contacts/create.ts src/tools/index.ts tests/unit/tools/contacts-create.test.ts
git commit -m "feat(tools): create_contact"
```

---

## Task 10: Tool — `update_contact`

**Files:**
- Create: `src/tools/contacts/update.ts`, `tests/unit/tools/contacts-update.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { updateContactTool } from "../../../src/tools/contacts/update.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const updateMock = vi.fn().mockResolvedValue({ id: 1, first_name: "Ana" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { update: updateMock } }),
}));

describe("update_contact", () => {
  it("updates by id with partial fields", async () => {
    const h = wrapHandler(updateContactTool.schema, updateContactTool.handler);
    const res = await h({ contact_id: 1, first_name: "Ana" });
    expect(res.isError).toBeFalsy();
    expect(updateMock).toHaveBeenCalledWith(1, expect.objectContaining({ first_name: "Ana" }));
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/tools/contacts/update.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  contact_id: z.union([z.number().int().positive(), z.string().min(1)]),
  phone: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

export const updateContactTool: ToolDefinition<typeof schema> = {
  name: "update_contact",
  description: "Actualiza un contacto existente. contact_id es requerido; los demás campos son opcionales.",
  schema,
  handler: async ({ contact_id, ...rest }) => {
    const client = getClient();
    return await client.contacts.update(contact_id as any, rest);
  },
};
```

- [ ] **Step 4: Register and test**

Add to `src/tools/index.ts`. Run `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/tools/contacts/update.ts src/tools/index.ts tests/unit/tools/contacts-update.test.ts
git commit -m "feat(tools): update_contact"
```

---

## Task 11: Tool — `delete_contact`

**Files:**
- Create: `src/tools/contacts/delete.ts`, `tests/unit/tools/contacts-delete.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { deleteContactTool } from "../../../src/tools/contacts/delete.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const delMock = vi.fn().mockResolvedValue({ deleted: true });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { delete: delMock } }),
}));

describe("delete_contact", () => {
  it("deletes by id", async () => {
    const h = wrapHandler(deleteContactTool.schema, deleteContactTool.handler);
    const res = await h({ contact_id: 1 });
    expect(res.isError).toBeFalsy();
    expect(delMock).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/tools/contacts/delete.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  contact_id: z.union([z.number().int().positive(), z.string().min(1)]),
});

export const deleteContactTool: ToolDefinition<typeof schema> = {
  name: "delete_contact",
  description: "Elimina un contacto por ID. Operación irreversible.",
  schema,
  handler: async ({ contact_id }) => {
    const client = getClient();
    return await client.contacts.delete(contact_id as any);
  },
};
```

- [ ] **Step 4: Register, test, commit**

```bash
git add src/tools/contacts/delete.ts src/tools/index.ts tests/unit/tools/contacts-delete.test.ts
git commit -m "feat(tools): delete_contact"
```

---

## Task 12: Tools — `add_label_to_contact` and `remove_label_from_contact`

**Files:**
- Create: `src/tools/contacts/add-label.ts`, `src/tools/contacts/remove-label.ts`
- Create: `tests/unit/tools/contacts-labels.test.ts`
- Modify: `src/tools/index.ts`

> The SDK may expose label-on-contact ops under `client.contacts.addLabel(...)` or under `client.labels.attach(...)`. Verify in `docs/sdk-surface.md`. The plan assumes `contacts.addLabel`/`contacts.removeLabel`.

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/tools/contacts-labels.test.ts
import { describe, it, expect, vi } from "vitest";
import { addLabelTool } from "../../../src/tools/contacts/add-label.js";
import { removeLabelTool } from "../../../src/tools/contacts/remove-label.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const addMock = vi.fn().mockResolvedValue({ ok: true });
const removeMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({
    contacts: { addLabel: addMock, removeLabel: removeMock },
  }),
}));

describe("contact labels", () => {
  it("adds label", async () => {
    const h = wrapHandler(addLabelTool.schema, addLabelTool.handler);
    const res = await h({ contact_id: 1, label_id: 9 });
    expect(res.isError).toBeFalsy();
    expect(addMock).toHaveBeenCalledWith(1, 9);
  });

  it("removes label", async () => {
    const h = wrapHandler(removeLabelTool.schema, removeLabelTool.handler);
    const res = await h({ contact_id: 1, label_id: 9 });
    expect(res.isError).toBeFalsy();
    expect(removeMock).toHaveBeenCalledWith(1, 9);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/tools/contacts/add-label.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  contact_id: z.union([z.number().int().positive(), z.string().min(1)]),
  label_id: z.union([z.number().int().positive(), z.string().min(1)]),
});

export const addLabelTool: ToolDefinition<typeof schema> = {
  name: "add_label_to_contact",
  description: "Agrega una etiqueta (label) a un contacto.",
  schema,
  handler: async ({ contact_id, label_id }) => {
    const client = getClient();
    return await client.contacts.addLabel(contact_id as any, label_id as any);
  },
};
```

- [ ] **Step 4: Implement `src/tools/contacts/remove-label.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  contact_id: z.union([z.number().int().positive(), z.string().min(1)]),
  label_id: z.union([z.number().int().positive(), z.string().min(1)]),
});

export const removeLabelTool: ToolDefinition<typeof schema> = {
  name: "remove_label_from_contact",
  description: "Quita una etiqueta (label) de un contacto.",
  schema,
  handler: async ({ contact_id, label_id }) => {
    const client = getClient();
    return await client.contacts.removeLabel(contact_id as any, label_id as any);
  },
};
```

- [ ] **Step 5: Register both, run tests, commit**

```bash
git add src/tools/contacts/add-label.ts src/tools/contacts/remove-label.ts src/tools/index.ts tests/unit/tools/contacts-labels.test.ts
git commit -m "feat(tools): add/remove label on contact"
```

---

## Task 13: Tool — `list_whatsapp_numbers`

**Files:**
- Create: `src/tools/whatsapp/list-numbers.ts`, `tests/unit/tools/whatsapp-list-numbers.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { listWhatsappNumbersTool } from "../../../src/tools/whatsapp/list-numbers.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({
    whatsapp: { listNumbers: vi.fn().mockResolvedValue([{ from_id: 1, phone: "+57..." }]) },
  }),
}));

describe("list_whatsapp_numbers", () => {
  it("returns numbers", async () => {
    const h = wrapHandler(listWhatsappNumbersTool.schema, listWhatsappNumbersTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    const body = JSON.parse(res.content[0].text);
    expect(body[0].from_id).toBe(1);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/tools/whatsapp/list-numbers.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listWhatsappNumbersTool: ToolDefinition<typeof schema> = {
  name: "list_whatsapp_numbers",
  description: "Lista los números de WhatsApp conectados a la cuenta (sus from_id).",
  schema,
  handler: async () => {
    const client = getClient();
    return await client.whatsapp.listNumbers();
  },
};
```

- [ ] **Step 4: Register, test, commit**

```bash
git add src/tools/whatsapp/list-numbers.ts src/tools/index.ts tests/unit/tools/whatsapp-list-numbers.test.ts
git commit -m "feat(tools): list_whatsapp_numbers"
```

---

## Task 14: Tool — `send_message`

**Files:**
- Create: `src/lib/from-id.ts`, `src/tools/whatsapp/send-message.ts`, `tests/unit/tools/whatsapp-send-message.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessageTool } from "../../../src/tools/whatsapp/send-message.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const sendMock = vi.fn().mockResolvedValue({ message_id: "m_1" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { sendMessage: sendMock } }),
}));

describe("send_message", () => {
  beforeEach(() => {
    sendMock.mockClear();
    delete process.env.WASAPI_FROM_ID;
  });

  it("uses explicit from_id when provided", async () => {
    const h = wrapHandler(sendMessageTool.schema, sendMessageTool.handler);
    const res = await h({ to: "+57300", message: "hi", from_id: 42 });
    expect(res.isError).toBeFalsy();
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "+57300", message: "hi", from_id: 42 }));
  });

  it("falls back to WASAPI_FROM_ID env var", async () => {
    process.env.WASAPI_FROM_ID = "99";
    const h = wrapHandler(sendMessageTool.schema, sendMessageTool.handler);
    await h({ to: "+57300", message: "hi" });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ from_id: 99 }));
  });

  it("errors when no from_id available anywhere", async () => {
    const h = wrapHandler(sendMessageTool.schema, sendMessageTool.handler);
    const res = await h({ to: "+57300", message: "hi" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/from_id/);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/lib/from-id.ts` (shared helper)**

```ts
export function resolveFromId(provided?: number): number {
  if (provided !== undefined) return provided;
  const env = process.env.WASAPI_FROM_ID;
  if (env) return Number(env);
  throw new Error("from_id is required: pass it as a parameter or set WASAPI_FROM_ID. Use list_whatsapp_numbers to discover available IDs.");
}
```

- [ ] **Step 4: Implement `src/tools/whatsapp/send-message.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  to: z.string().regex(/^\+?\d{7,15}$/, "to must be a phone number in E.164-like format"),
  message: z.string().min(1).max(4096),
  from_id: z.number().int().positive().optional(),
});

export const sendMessageTool: ToolDefinition<typeof schema> = {
  name: "send_message",
  description: "Envía un mensaje de texto por WhatsApp. from_id es opcional si WASAPI_FROM_ID está seteado.",
  schema,
  handler: async ({ to, message, from_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await client.whatsapp.sendMessage({ to, message, from_id: resolved });
  },
};
```

- [ ] **Step 5: Register, test, commit**

```bash
git add src/lib/from-id.ts src/tools/whatsapp/send-message.ts src/tools/index.ts tests/unit/tools/whatsapp-send-message.test.ts
git commit -m "feat(tools): send_message with from_id fallback"
```

---

## Task 15: Tool — `send_template`

**Files:**
- Create: `src/tools/whatsapp/send-template.ts`, `tests/unit/tools/whatsapp-send-template.test.ts`
- Modify: `src/tools/index.ts`

> The shape of `variables` depends on the Wasapi template system. The spec lists this as an open question; the plan accepts a generic `Record<string, string>` and lets the SDK reject malformed inputs.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTemplateTool } from "../../../src/tools/whatsapp/send-template.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const sendMock = vi.fn().mockResolvedValue({ message_id: "m_t" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { sendTemplate: sendMock } }),
}));

describe("send_template", () => {
  beforeEach(() => {
    sendMock.mockClear();
    process.env.WASAPI_FROM_ID = "10";
  });

  it("sends template with variables", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({ to: "+57300", template_name: "welcome", variables: { "1": "Ana" } });
    expect(res.isError).toBeFalsy();
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "+57300",
      template_name: "welcome",
      variables: { "1": "Ana" },
      from_id: 10,
    }));
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/tools/whatsapp/send-template.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  to: z.string().regex(/^\+?\d{7,15}$/),
  template_name: z.string().min(1),
  variables: z.record(z.string(), z.string()).optional(),
  from_id: z.number().int().positive().optional(),
});

export const sendTemplateTool: ToolDefinition<typeof schema> = {
  name: "send_template",
  description: "Envía una plantilla aprobada de WhatsApp con variables opcionales.",
  schema,
  handler: async ({ to, template_name, variables, from_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await client.whatsapp.sendTemplate({ to, template_name, variables, from_id: resolved });
  },
};
```

- [ ] **Step 4: Register, test, commit**

```bash
git add src/tools/whatsapp/send-template.ts src/tools/index.ts tests/unit/tools/whatsapp-send-template.test.ts
git commit -m "feat(tools): send_template"
```

---

## Task 16: Tool — `send_attachment`

**Files:**
- Create: `src/tools/whatsapp/send-attachment.ts`, `tests/unit/tools/whatsapp-send-attachment.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendAttachmentTool } from "../../../src/tools/whatsapp/send-attachment.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const sendMock = vi.fn().mockResolvedValue({ message_id: "m_a" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { sendAttachment: sendMock } }),
}));

describe("send_attachment", () => {
  beforeEach(() => {
    sendMock.mockClear();
    process.env.WASAPI_FROM_ID = "10";
  });

  it("sends image with caption", async () => {
    const h = wrapHandler(sendAttachmentTool.schema, sendAttachmentTool.handler);
    const res = await h({ to: "+57300", url: "https://x/y.png", type: "image", caption: "hi" });
    expect(res.isError).toBeFalsy();
    expect(sendMock).toHaveBeenCalled();
  });

  it("rejects invalid type", async () => {
    const h = wrapHandler(sendAttachmentTool.schema, sendAttachmentTool.handler);
    const res = await h({ to: "+57300", url: "https://x/y.png", type: "exe" });
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/tools/whatsapp/send-attachment.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  to: z.string().regex(/^\+?\d{7,15}$/),
  url: z.string().url(),
  type: z.enum(["image", "document", "audio", "video"]),
  caption: z.string().optional(),
  from_id: z.number().int().positive().optional(),
});

export const sendAttachmentTool: ToolDefinition<typeof schema> = {
  name: "send_attachment",
  description: "Envía un archivo adjunto (imagen, documento, audio o video) por WhatsApp desde una URL pública.",
  schema,
  handler: async ({ to, url, type, caption, from_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await client.whatsapp.sendAttachment({ to, url, type, caption, from_id: resolved });
  },
};
```

- [ ] **Step 4: Register, test, commit**

```bash
git add src/tools/whatsapp/send-attachment.ts src/tools/index.ts tests/unit/tools/whatsapp-send-attachment.test.ts
git commit -m "feat(tools): send_attachment"
```

---

## Task 17: Tools — `list_conversations` and `get_conversation`

**Files:**
- Create: `src/tools/whatsapp/list-conversations.ts`, `src/tools/whatsapp/get-conversation.ts`
- Create: `tests/unit/tools/whatsapp-conversations.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { listConversationsTool } from "../../../src/tools/whatsapp/list-conversations.js";
import { getConversationTool } from "../../../src/tools/whatsapp/get-conversation.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const listMock = vi.fn().mockResolvedValue({ data: [{ id: "c1" }] });
const getMock = vi.fn().mockResolvedValue({ id: "c1", messages: [] });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({
    whatsapp: { listConversations: listMock, getConversation: getMock },
  }),
}));

describe("conversations", () => {
  it("list_conversations works without args", async () => {
    const h = wrapHandler(listConversationsTool.schema, listConversationsTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
  });

  it("get_conversation requires conversation_id", async () => {
    const h = wrapHandler(getConversationTool.schema, getConversationTool.handler);
    const bad = await h({});
    expect(bad.isError).toBe(true);
    const ok = await h({ conversation_id: "c1" });
    expect(ok.isError).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `src/tools/whatsapp/list-conversations.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  page: z.number().int().positive().optional(),
  status: z.enum(["open", "closed", "pending"]).optional(),
});

export const listConversationsTool: ToolDefinition<typeof schema> = {
  name: "list_conversations",
  description: "Lista conversaciones de WhatsApp, opcionalmente filtradas por estado.",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await client.whatsapp.listConversations(args);
  },
};
```

- [ ] **Step 4: Implement `src/tools/whatsapp/get-conversation.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  conversation_id: z.union([z.string().min(1), z.number().int().positive()]),
});

export const getConversationTool: ToolDefinition<typeof schema> = {
  name: "get_conversation",
  description: "Obtiene los detalles y mensajes de una conversación específica.",
  schema,
  handler: async ({ conversation_id }) => {
    const client = getClient();
    return await client.whatsapp.getConversation(conversation_id as any);
  },
};
```

- [ ] **Step 5: Register both, run tests, commit**

```bash
git add src/tools/whatsapp/list-conversations.ts src/tools/whatsapp/get-conversation.ts src/tools/index.ts tests/unit/tools/whatsapp-conversations.test.ts
git commit -m "feat(tools): list_conversations and get_conversation"
```

---

## Task 18: Contract tests

**Files:**
- Create: `tests/contracts/sdk-shapes.test.ts`

The goal: lock in the SDK response shapes we depend on. If the SDK changes, these fail.

- [ ] **Step 1: Write the contract test**

```ts
// tests/contracts/sdk-shapes.test.ts
import { describe, it, expectTypeOf } from "vitest";
import type { WasapiClient } from "@wasapi/js-sdk";

// These tests are type-level only. They compile-fail if the SDK shape drifts.

describe("SDK shape contracts", () => {
  it("contacts.list returns paginated data", () => {
    type ListFn = WasapiClient["contacts"]["list"];
    expectTypeOf<ListFn>().toBeFunction();
  });

  it("whatsapp.sendMessage exists", () => {
    type Fn = WasapiClient["whatsapp"]["sendMessage"];
    expectTypeOf<Fn>().toBeFunction();
  });
});
```

> If any of the typed accesses above fail because the SDK uses different paths (e.g. `client.whatsapp.send_message` instead of `sendMessage`), update the test AND every affected tool handler. The SDK's actual exports — verified in Task 4's `docs/sdk-surface.md` — are the ground truth.

- [ ] **Step 2: Run, expect pass (or refactor if SDK shape differs)**

Run: `npm test -- tests/contracts/sdk-shapes.test.ts`

- [ ] **Step 3: Commit**

```bash
git add tests/contracts/sdk-shapes.test.ts
git commit -m "test: SDK shape contracts"
```

---

## Task 19: Integration smoke tests (opt-in)

**Files:**
- Create: `tests/integration/smoke.test.ts`

- [ ] **Step 1: Write smoke test**

```ts
// tests/integration/smoke.test.ts
import { describe, it, expect } from "vitest";
import { listContactsTool } from "../../src/tools/contacts/list.js";
import { wrapHandler } from "../../src/lib/register-tool.js";

const RUN = !!process.env.WASAPI_TEST_API_KEY;

describe.skipIf(!RUN)("integration smoke", () => {
  it("can list contacts against real Wasapi", async () => {
    process.env.WASAPI_API_KEY = process.env.WASAPI_TEST_API_KEY!;
    const h = wrapHandler(listContactsTool.schema, listContactsTool.handler);
    const res = await h({ per_page: 1 });
    expect(res.isError).toBeFalsy();
  });
});
```

- [ ] **Step 2: Verify it skips by default**

Run: `npm test` → smoke test skipped (no `WASAPI_TEST_API_KEY`).

- [ ] **Step 3: Document opt-in run**

In README, add a section "Running integration tests" with: `WASAPI_TEST_API_KEY=xxx npm run test:integration`.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/smoke.test.ts
git commit -m "test: opt-in integration smoke against real Wasapi"
```

---

## Task 20: README + publish prep

**Files:**
- Modify: `README.md`
- Verify: `package.json` is publish-ready

- [ ] **Step 1: Write README**

```markdown
# @wasapi/mcp-server

MCP server for [Wasapi](https://wasapi.io). Lets Claude manage your Wasapi contacts and send WhatsApp messages.

## Install

Add to `claude_desktop_config.json` (Claude Desktop) or your Claude Code MCP config:

\`\`\`json
{
  "mcpServers": {
    "wasapi": {
      "command": "npx",
      "args": ["-y", "@wasapi/mcp-server"],
      "env": {
        "WASAPI_API_KEY": "your_api_key_here",
        "WASAPI_FROM_ID": "12345"
      }
    }
  }
}
\`\`\`

## Configuration

| Variable | Required | Description |
|---|---|---|
| `WASAPI_API_KEY` | yes | Your Wasapi API key (https://app.wasapi.io/) |
| `WASAPI_FROM_ID` | no | Default WhatsApp number ID for outgoing messages |
| `WASAPI_BASE_URL` | no | Override SDK base URL (staging/testing) |
| `WASAPI_DEBUG` | no | Set to `1` for verbose stderr logging |

## Tools

**Contacts:** `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `delete_contact`, `add_label_to_contact`, `remove_label_from_contact`

**WhatsApp:** `list_whatsapp_numbers`, `send_message`, `send_template`, `send_attachment`, `list_conversations`, `get_conversation`

## Development

\`\`\`bash
npm install
npm run dev          # run with tsx
npm test             # unit + contract tests
npm run test:integration  # opt-in, needs WASAPI_TEST_API_KEY
npm run typecheck
npm run build
\`\`\`

## License

ISC
```

- [ ] **Step 2: Build and verify**

Run:
```bash
npm run build
node dist/index.js < /dev/null
```
Expected: exits with `Missing WASAPI_API_KEY` error to stderr (good — fail-fast works).

- [ ] **Step 3: Pack and inspect**

```bash
npm pack --dry-run
```
Expected: includes `dist/`, `README.md`, `package.json`. Excludes `src/`, `tests/`, `docs/`.

- [ ] **Step 4: Run full test suite**

```bash
npm test && npm run typecheck
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json
git commit -m "docs: README + publish-ready package.json"
```

- [ ] **Step 6: Tag v0.1.0 (do NOT publish without user confirmation)**

```bash
git tag v0.1.0
```

Note: `npm publish` is intentionally NOT in this plan — that's a manual step the user does after a final review.
