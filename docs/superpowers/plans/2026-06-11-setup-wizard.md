# Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive `wasapi-mcp setup` subcommand that collects the API key, validates it, optionally picks a default `from_id`, and writes the entry into `claude_desktop_config.json` — so non-technical users install with one command.

**Architecture:** A new `src/setup/` module siblings the existing MCP server. `src/index.ts` gets a tiny dispatcher that routes `setup` to a dynamically-imported wizard. The wizard composes 5 focused units (prompt, browser, config-path, config-write, validate-key). The MCP server itself is untouched.

**Tech Stack:** Same as v0.1 — Node.js, TypeScript, `@wasapi/js-sdk`, `vitest`. No new deps. `readline` and `child_process` are Node built-ins.

**Spec:** `docs/superpowers/specs/2026-06-11-setup-wizard-design.md`

---

## Task 1: Subcommand dispatcher

Add argv routing to `src/index.ts` so `wasapi-mcp setup`, `--version`, and `--help` work. `setup` is dynamically imported so the MCP boot path doesn't pay for it.

**Files:**
- Modify: `src/index.ts`
- Create: `tests/unit/cli-dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cli-dispatch.test.ts
import { describe, it, expect, vi } from "vitest";
import { dispatch } from "../../src/index.js";

describe("dispatch", () => {
  it("returns 'server' for no args", () => {
    expect(dispatch([])).toEqual({ kind: "server" });
  });
  it("returns 'setup' for setup", () => {
    expect(dispatch(["setup"])).toEqual({ kind: "setup", printOnly: false });
  });
  it("returns 'setup' with printOnly=true for setup --print-only", () => {
    expect(dispatch(["setup", "--print-only"])).toEqual({ kind: "setup", printOnly: true });
  });
  it("returns 'version' for --version", () => {
    expect(dispatch(["--version"])).toEqual({ kind: "version" });
  });
  it("returns 'help' for --help", () => {
    expect(dispatch(["--help"])).toEqual({ kind: "help" });
  });
  it("returns 'unknown' for anything else", () => {
    expect(dispatch(["foo"])).toEqual({ kind: "unknown", arg: "foo" });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/cli-dispatch.test.ts`
Expected: FAIL — `dispatch` not exported.

- [ ] **Step 3: Refactor `src/index.ts`**

```ts
#!/usr/bin/env node

console.log = (...args: unknown[]) => {
  process.stderr.write(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n");
};
console.info = console.log;
console.debug = console.log;

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export type DispatchResult =
  | { kind: "server" }
  | { kind: "setup"; printOnly: boolean }
  | { kind: "version" }
  | { kind: "help" }
  | { kind: "unknown"; arg: string };

export function dispatch(args: string[]): DispatchResult {
  if (args.length === 0) return { kind: "server" };
  const first = args[0];
  if (first === "setup") {
    const printOnly = args.includes("--print-only");
    return { kind: "setup", printOnly };
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
      await runSetup({ printOnly: result.printOnly });
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

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith("/index.js")) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${err?.message ?? err}\n`);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/cli-dispatch.test.ts && npm run typecheck`
Expected: 6 passing, typecheck clean.

- [ ] **Step 5: Smoke test the binary**

Run: `npm run build && node dist/index.js --version && node dist/index.js --help | head -5`
Expected: version printed, help printed.

- [ ] **Step 6: Verify server still starts**

Run: `WASAPI_API_KEY=dummy node dist/index.js < /dev/null &`
Expected: stays running (will be killed by pipe close shortly). No crash. Kill with `kill %1` if needed.

- [ ] **Step 7: Commit**

```bash
git add src/index.ts tests/unit/cli-dispatch.test.ts
git commit -m "feat(cli): subcommand dispatcher with --version, --help, setup"
```

---

## Task 2: prompt.ts — readline wrapper

Three primitives: plain `question`, `maskedQuestion` (for the API key), `numberInRange` (for the from_id selection).

**Files:**
- Create: `src/setup/prompt.ts`
- Create: `tests/unit/setup-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/setup-prompt.test.ts
import { describe, it, expect } from "vitest";
import { Readable, Writable } from "node:stream";
import { question, numberInRange } from "../../src/setup/prompt.js";

function makeStdin(input: string): NodeJS.ReadableStream {
  return Readable.from([input]);
}

function makeStdout(): { stream: NodeJS.WritableStream; written: string } {
  const ref = { written: "" };
  const stream = new Writable({
    write(chunk, _enc, cb) {
      ref.written += chunk.toString();
      cb();
    },
  }) as unknown as NodeJS.WritableStream;
  return { stream, written: "" } as any;
}

describe("question", () => {
  it("returns trimmed user input", async () => {
    const stdin = makeStdin("  hello  \n");
    const out = makeStdout();
    const ans = await question("prompt> ", { stdin, stdout: out.stream });
    expect(ans).toBe("hello");
  });
});

describe("numberInRange", () => {
  it("returns the chosen index (1-based)", async () => {
    const stdin = makeStdin("2\n");
    const out = makeStdout();
    const ans = await numberInRange("pick> ", 1, 3, { stdin, stdout: out.stream });
    expect(ans).toBe(2);
  });

  it("returns null on empty input when allowEmpty=true", async () => {
    const stdin = makeStdin("\n");
    const out = makeStdout();
    const ans = await numberInRange("pick> ", 1, 3, { stdin, stdout: out.stream, allowEmpty: true });
    expect(ans).toBeNull();
  });

  it("re-prompts on out-of-range, then accepts valid", async () => {
    const stdin = makeStdin("9\n2\n");
    const out = makeStdout();
    const ans = await numberInRange("pick> ", 1, 3, { stdin, stdout: out.stream });
    expect(ans).toBe(2);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/setup-prompt.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/setup/prompt.ts`**

```ts
import * as readline from "node:readline";

export interface PromptStreams {
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
}

const stripQuotes = (s: string): string => s.replace(/^['"]+|['"]+$/g, "");

export async function question(label: string, streams: PromptStreams = {}): Promise<string> {
  const rl = readline.createInterface({
    input: streams.stdin ?? process.stdin,
    output: streams.stdout ?? process.stdout,
  });
  try {
    const answer = await new Promise<string>((resolve) => rl.question(label, resolve));
    return stripQuotes(answer.trim());
  } finally {
    rl.close();
  }
}

export interface NumberInRangeOpts extends PromptStreams {
  allowEmpty?: boolean;
}

export async function numberInRange(
  label: string,
  min: number,
  max: number,
  opts: NumberInRangeOpts = {},
): Promise<number | null> {
  while (true) {
    const raw = await question(label, opts);
    if (raw === "" && opts.allowEmpty) return null;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= min && n <= max) return n;
    const out = opts.stdout ?? process.stdout;
    out.write(`  ✗ Ingresa un número entre ${min} y ${max}.\n`);
  }
}

export async function maskedQuestion(label: string, streams: PromptStreams = {}): Promise<string> {
  const input = (streams.stdin ?? process.stdin) as NodeJS.ReadStream;
  const output = streams.stdout ?? process.stdout;

  output.write(label);

  if (!input.isTTY) {
    // Non-TTY: read a line plainly. Mostly used in tests via piped input.
    const rl = readline.createInterface({ input, output });
    try {
      const answer = await new Promise<string>((resolve) => rl.once("line", resolve));
      return stripQuotes(answer.trim());
    } finally {
      rl.close();
    }
  }

  const wasRaw = input.isRaw;
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");

  return await new Promise<string>((resolve, reject) => {
    let buf = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          cleanup();
          output.write("\n");
          resolve(stripQuotes(buf.trim()));
          return;
        }
        if (ch === "") {
          cleanup();
          output.write("\n");
          process.exit(0);
        }
        if (ch === "" || ch === "\b") {
          if (buf.length > 0) {
            buf = buf.slice(0, -1);
            output.write("\b \b");
          }
          continue;
        }
        buf += ch;
        output.write("*");
      }
    };
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(wasRaw);
      input.pause();
    };
    input.on("data", onData);
    input.once("error", (err) => {
      cleanup();
      reject(err);
    });
  });
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/setup-prompt.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/setup/prompt.ts tests/unit/setup-prompt.test.ts
git commit -m "feat(setup): readline-based prompt helpers"
```

---

## Task 3: browser.ts — open URL by OS

Wrap `child_process.spawn` with the right command per OS. Non-blocking; failures don't throw — they return false so the wizard continues.

**Files:**
- Create: `src/setup/browser.ts`
- Create: `tests/unit/setup-browser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/setup-browser.test.ts
import { describe, it, expect, vi } from "vitest";
import * as childProcess from "node:child_process";
import { resolveOpenCommand } from "../../src/setup/browser.js";

describe("resolveOpenCommand", () => {
  it("returns 'open' on darwin", () => {
    expect(resolveOpenCommand("darwin")).toEqual({ command: "open", argsPrefix: [] });
  });
  it("returns explorer on win32", () => {
    expect(resolveOpenCommand("win32")).toEqual({ command: "cmd", argsPrefix: ["/c", "start", ""] });
  });
  it("returns xdg-open on linux", () => {
    expect(resolveOpenCommand("linux")).toEqual({ command: "xdg-open", argsPrefix: [] });
  });
  it("returns null on unknown", () => {
    expect(resolveOpenCommand("freebsd")).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/setup-browser.test.ts`

- [ ] **Step 3: Implement `src/setup/browser.ts`**

```ts
import { spawn } from "node:child_process";

export interface OpenCommand {
  command: string;
  argsPrefix: string[];
}

export function resolveOpenCommand(platform: NodeJS.Platform): OpenCommand | null {
  if (platform === "darwin") return { command: "open", argsPrefix: [] };
  if (platform === "win32") return { command: "cmd", argsPrefix: ["/c", "start", ""] };
  if (platform === "linux") return { command: "xdg-open", argsPrefix: [] };
  return null;
}

export async function openInBrowser(url: string, platform: NodeJS.Platform = process.platform): Promise<boolean> {
  const cmd = resolveOpenCommand(platform);
  if (!cmd) return false;
  try {
    const child = spawn(cmd.command, [...cmd.argsPrefix, url], { stdio: "ignore", detached: true });
    child.unref();
    return await new Promise<boolean>((resolve) => {
      child.once("error", () => resolve(false));
      setTimeout(() => resolve(true), 100);
    });
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/setup-browser.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/setup/browser.ts tests/unit/setup-browser.test.ts
git commit -m "feat(setup): cross-platform browser opener"
```

---

## Task 4: config-path.ts — resolve config path per OS

Pure function: takes platform + env, returns the right path. Easy to unit test.

**Files:**
- Create: `src/setup/config-path.ts`
- Create: `tests/unit/setup-config-path.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/setup-config-path.test.ts
import { describe, it, expect } from "vitest";
import { resolveConfigPath } from "../../src/setup/config-path.js";

describe("resolveConfigPath", () => {
  it("returns macOS path", () => {
    expect(resolveConfigPath({ platform: "darwin", env: { HOME: "/Users/x" } })).toBe(
      "/Users/x/Library/Application Support/Claude/claude_desktop_config.json",
    );
  });

  it("returns Windows path", () => {
    expect(resolveConfigPath({ platform: "win32", env: { APPDATA: "C:\\Users\\x\\AppData\\Roaming" } })).toBe(
      "C:\\Users\\x\\AppData\\Roaming\\Claude\\claude_desktop_config.json",
    );
  });

  it("returns Linux path", () => {
    expect(resolveConfigPath({ platform: "linux", env: { HOME: "/home/x" } })).toBe(
      "/home/x/.config/Claude/claude_desktop_config.json",
    );
  });

  it("respects CLAUDE_DESKTOP_CONFIG override", () => {
    expect(
      resolveConfigPath({
        platform: "darwin",
        env: { HOME: "/Users/x", CLAUDE_DESKTOP_CONFIG: "/custom/path.json" },
      }),
    ).toBe("/custom/path.json");
  });

  it("throws when HOME is missing on unix", () => {
    expect(() => resolveConfigPath({ platform: "linux", env: {} })).toThrow(/HOME/);
  });

  it("throws when APPDATA is missing on windows", () => {
    expect(() => resolveConfigPath({ platform: "win32", env: {} })).toThrow(/APPDATA/);
  });

  it("throws on unsupported platform", () => {
    expect(() => resolveConfigPath({ platform: "freebsd" as any, env: {} })).toThrow(/Unsupported platform/);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/setup-config-path.test.ts`

- [ ] **Step 3: Implement `src/setup/config-path.ts`**

```ts
import { join } from "node:path";

export interface ResolveOpts {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
}

export function resolveConfigPath({ platform, env }: ResolveOpts): string {
  if (env.CLAUDE_DESKTOP_CONFIG) return env.CLAUDE_DESKTOP_CONFIG;
  if (platform === "darwin") {
    if (!env.HOME) throw new Error("HOME env var is not set; cannot locate Claude Desktop config.");
    return join(env.HOME, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (platform === "win32") {
    if (!env.APPDATA) throw new Error("APPDATA env var is not set; cannot locate Claude Desktop config.");
    return join(env.APPDATA, "Claude", "claude_desktop_config.json");
  }
  if (platform === "linux") {
    if (!env.HOME) throw new Error("HOME env var is not set; cannot locate Claude Desktop config.");
    return join(env.HOME, ".config", "Claude", "claude_desktop_config.json");
  }
  throw new Error(`Unsupported platform: ${platform}`);
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/setup-config-path.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/setup/config-path.ts tests/unit/setup-config-path.test.ts
git commit -m "feat(setup): per-OS Claude Desktop config path resolver"
```

---

## Task 5: validate-key.ts — call SDK to confirm key

Thin wrapper: instantiate `WasapiClient` with the candidate key, call `whatsapp.getWhatsappNumbers()`. Pass errors through `mapError`. Returns `{ ok: true, numbers }` or `{ ok: false, message }`.

**Files:**
- Create: `src/setup/validate-key.ts`
- Create: `tests/unit/setup-validate-key.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/setup-validate-key.test.ts
import { describe, it, expect, vi } from "vitest";
import { validateKey } from "../../src/setup/validate-key.js";

describe("validateKey", () => {
  it("returns ok with numbers on success", async () => {
    const fakeClient = {
      whatsapp: { getWhatsappNumbers: vi.fn().mockResolvedValue([{ id: 1, phone: "+57..." }]) },
    } as any;
    const r = await validateKey("good_key", { clientFactory: () => fakeClient });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.numbers).toHaveLength(1);
  });

  it("returns auth error on 401", async () => {
    const err = { isAxiosError: true, response: { status: 401 } };
    const fakeClient = {
      whatsapp: { getWhatsappNumbers: vi.fn().mockRejectedValue(err) },
    } as any;
    const r = await validateKey("bad", { clientFactory: () => fakeClient });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.category).toBe("auth");
      expect(r.message).toMatch(/API key/);
    }
  });

  it("returns network error when no response", async () => {
    const err = { isAxiosError: true, code: "ECONNREFUSED" };
    const fakeClient = {
      whatsapp: { getWhatsappNumbers: vi.fn().mockRejectedValue(err) },
    } as any;
    const r = await validateKey("k", { clientFactory: () => fakeClient });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe("network");
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/setup-validate-key.test.ts`

- [ ] **Step 3: Implement `src/setup/validate-key.ts`**

```ts
import { WasapiClient } from "@wasapi/js-sdk";
import { mapError, type ErrorCategory } from "../lib/errors.js";

export interface WhatsappNumber {
  id: number;
  phone?: string;
  [k: string]: unknown;
}

export type ValidateResult =
  | { ok: true; numbers: WhatsappNumber[] }
  | { ok: false; category: ErrorCategory; message: string };

export interface ValidateOpts {
  clientFactory?: (apiKey: string) => unknown;
}

export async function validateKey(apiKey: string, opts: ValidateOpts = {}): Promise<ValidateResult> {
  const client = (opts.clientFactory ?? ((k: string) => new WasapiClient(k as any)))(apiKey) as any;
  try {
    const result = await client.whatsapp.getWhatsappNumbers();
    const numbers: WhatsappNumber[] = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
    return { ok: true, numbers };
  } catch (err) {
    const m = mapError(err);
    return { ok: false, category: m.category, message: m.message };
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/setup-validate-key.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/setup/validate-key.ts tests/unit/setup-validate-key.test.ts
git commit -m "feat(setup): API key validator via SDK"
```

---

## Task 6: config-write.ts — read, merge, backup, write

Pure-ish module: takes a path + a "wasapi entry" object, returns the result. Side-effects are FS reads/writes; we test by passing an in-memory FS or by writing to a temp directory.

**Files:**
- Create: `src/setup/config-write.ts`
- Create: `tests/unit/setup-config-write.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/setup-config-write.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeWasapiEntry, readConfig, type WasapiEntry } from "../../src/setup/config-write.js";

let tmp: string;
let cfgPath: string;
const entry: WasapiEntry = {
  command: "npx",
  args: ["-y", "@wasapi/mcp-server"],
  env: { WASAPI_API_KEY: "k", WASAPI_FROM_ID: "1" },
};

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wasapi-test-"));
  cfgPath = join(tmp, "claude_desktop_config.json");
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("readConfig", () => {
  it("returns empty object if file does not exist", () => {
    expect(readConfig(cfgPath)).toEqual({});
  });

  it("throws on invalid JSON", () => {
    writeFileSync(cfgPath, "{ not json");
    expect(() => readConfig(cfgPath)).toThrow(/JSON|parse/i);
  });
});

describe("writeWasapiEntry", () => {
  it("creates config from scratch", () => {
    writeWasapiEntry({ path: cfgPath, entry, overwrite: true });
    const written = JSON.parse(readFileSync(cfgPath, "utf8"));
    expect(written.mcpServers.wasapi).toEqual(entry);
  });

  it("preserves other mcpServers", () => {
    writeFileSync(cfgPath, JSON.stringify({ mcpServers: { other: { command: "x" } } }));
    writeWasapiEntry({ path: cfgPath, entry, overwrite: true });
    const written = JSON.parse(readFileSync(cfgPath, "utf8"));
    expect(written.mcpServers.other).toEqual({ command: "x" });
    expect(written.mcpServers.wasapi).toEqual(entry);
  });

  it("creates a timestamped backup before writing", () => {
    writeFileSync(cfgPath, JSON.stringify({ mcpServers: {} }));
    writeWasapiEntry({ path: cfgPath, entry, overwrite: true });
    const backups = readdirSync(tmp).filter((f) => f.startsWith("claude_desktop_config.json.bak-"));
    expect(backups).toHaveLength(1);
  });

  it("does not backup when file did not exist", () => {
    writeWasapiEntry({ path: cfgPath, entry, overwrite: true });
    const backups = readdirSync(tmp).filter((f) => f.startsWith("claude_desktop_config.json.bak-"));
    expect(backups).toHaveLength(0);
  });

  it("reports whether wasapi entry already existed", () => {
    writeFileSync(cfgPath, JSON.stringify({ mcpServers: { wasapi: { command: "old" } } }));
    const result = writeWasapiEntry({ path: cfgPath, entry, overwrite: true });
    expect(result.existedBefore).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/setup-config-write.test.ts`

- [ ] **Step 3: Implement `src/setup/config-write.ts`**

```ts
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";

export interface WasapiEntry {
  command: string;
  args: string[];
  env: { WASAPI_API_KEY: string; WASAPI_FROM_ID?: string };
}

export interface ConfigShape {
  mcpServers?: Record<string, unknown>;
  [k: string]: unknown;
}

export function readConfig(path: string): ConfigShape {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Config root must be an object");
    }
    return parsed as ConfigShape;
  } catch (e) {
    throw new Error(`Failed to parse ${path}: ${(e as Error).message}`);
  }
}

function timestampForBackup(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

export interface WriteOpts {
  path: string;
  entry: WasapiEntry;
  overwrite: boolean;
  now?: Date;
}

export interface WriteResult {
  existedBefore: boolean;
  backupPath: string | null;
}

export function writeWasapiEntry({ path, entry, overwrite, now }: WriteOpts): WriteResult {
  const fileExisted = existsSync(path);
  const config = readConfig(path);
  config.mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
  const existedBefore = "wasapi" in config.mcpServers;

  if (existedBefore && !overwrite) {
    return { existedBefore, backupPath: null };
  }

  let backupPath: string | null = null;
  if (fileExisted) {
    backupPath = `${path}.bak-${timestampForBackup(now ?? new Date())}`;
    copyFileSync(path, backupPath);
  }
  config.mcpServers.wasapi = entry;
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf8");
  return { existedBefore, backupPath };
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/setup-config-write.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/setup/config-write.ts tests/unit/setup-config-write.test.ts
git commit -m "feat(setup): claude_desktop_config.json read/merge/write with backup"
```

---

## Task 7: setup/index.ts — orchestrator (happy path)

The wizard that ties everything together. Initial scope: happy path only. Edge cases land in Task 8.

**Files:**
- Create: `src/setup/index.ts`
- Create: `tests/unit/setup-orchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/setup-orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSetup } from "../../src/setup/index.js";

const deps = {
  openInBrowser: vi.fn().mockResolvedValue(true),
  resolveConfigPath: vi.fn().mockReturnValue("/tmp/claude_desktop_config.json"),
  validateKey: vi.fn().mockResolvedValue({ ok: true, numbers: [{ id: 12345, phone: "+57300" }] }),
  writeWasapiEntry: vi.fn().mockReturnValue({ existedBefore: false, backupPath: null }),
  question: vi.fn(),
  maskedQuestion: vi.fn(),
  numberInRange: vi.fn(),
  stdout: { write: vi.fn() } as any,
};

beforeEach(() => {
  vi.clearAllMocks();
  deps.openInBrowser.mockResolvedValue(true);
  deps.validateKey.mockResolvedValue({ ok: true, numbers: [{ id: 12345, phone: "+57300" }] });
  deps.writeWasapiEntry.mockReturnValue({ existedBefore: false, backupPath: null });
});

describe("runSetup happy path", () => {
  it("with 1 number, auto-selects from_id and writes config", async () => {
    deps.maskedQuestion.mockResolvedValueOnce("key_abc");
    deps.question.mockResolvedValueOnce("y"); // confirm write config

    await runSetup({ printOnly: false, deps: deps as any });

    expect(deps.validateKey).toHaveBeenCalledWith("key_abc", expect.anything());
    expect(deps.writeWasapiEntry).toHaveBeenCalled();
    const call = deps.writeWasapiEntry.mock.calls[0][0];
    expect(call.entry.env.WASAPI_API_KEY).toBe("key_abc");
    expect(call.entry.env.WASAPI_FROM_ID).toBe("12345");
  });

  it("with 0 numbers, skips from_id and still writes", async () => {
    deps.validateKey.mockResolvedValue({ ok: true, numbers: [] });
    deps.maskedQuestion.mockResolvedValueOnce("key_abc");
    deps.question.mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, deps: deps as any });

    const call = deps.writeWasapiEntry.mock.calls[0][0];
    expect(call.entry.env.WASAPI_FROM_ID).toBeUndefined();
  });

  it("with multiple numbers, asks user to pick", async () => {
    deps.validateKey.mockResolvedValue({
      ok: true,
      numbers: [{ id: 11, phone: "+1" }, { id: 22, phone: "+2" }],
    });
    deps.maskedQuestion.mockResolvedValueOnce("key_abc");
    deps.numberInRange.mockResolvedValueOnce(2);
    deps.question.mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, deps: deps as any });

    const call = deps.writeWasapiEntry.mock.calls[0][0];
    expect(call.entry.env.WASAPI_FROM_ID).toBe("22");
  });

  it("printOnly does not write to disk", async () => {
    deps.maskedQuestion.mockResolvedValueOnce("key_abc");

    await runSetup({ printOnly: true, deps: deps as any });

    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    const out = (deps.stdout.write as any).mock.calls.map((c: any[]) => c[0]).join("");
    expect(out).toContain('"WASAPI_API_KEY": "key_abc"');
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/setup-orchestrator.test.ts`

- [ ] **Step 3: Implement `src/setup/index.ts`**

```ts
import { openInBrowser } from "./browser.js";
import { resolveConfigPath } from "./config-path.js";
import { validateKey, type ValidateResult, type WhatsappNumber } from "./validate-key.js";
import { writeWasapiEntry, type WasapiEntry } from "./config-write.js";
import { question, maskedQuestion, numberInRange } from "./prompt.js";

const DASHBOARD_URL = process.env.WASAPI_DASHBOARD_URL ?? "https://app.wasapi.io/account/developer";

export interface RunSetupOpts {
  printOnly: boolean;
  deps?: SetupDeps;
}

export interface SetupDeps {
  openInBrowser: typeof openInBrowser;
  resolveConfigPath: typeof resolveConfigPath;
  validateKey: typeof validateKey;
  writeWasapiEntry: typeof writeWasapiEntry;
  question: typeof question;
  maskedQuestion: typeof maskedQuestion;
  numberInRange: typeof numberInRange;
  stdout: NodeJS.WritableStream;
}

const defaultDeps: SetupDeps = {
  openInBrowser,
  resolveConfigPath,
  validateKey,
  writeWasapiEntry,
  question,
  maskedQuestion,
  numberInRange,
  stdout: process.stdout,
};

function formatNumber(n: WhatsappNumber, idx: number): string {
  const phone = (n.phone as string | undefined) ?? "(sin teléfono)";
  return `  ${idx + 1}) ${phone}   (id: ${n.id})`;
}

function buildEntry(apiKey: string, fromId: number | null): WasapiEntry {
  const env: WasapiEntry["env"] = { WASAPI_API_KEY: apiKey };
  if (fromId !== null) env.WASAPI_FROM_ID = String(fromId);
  return { command: "npx", args: ["-y", "@wasapi/mcp-server"], env };
}

export async function runSetup(opts: RunSetupOpts): Promise<void> {
  const d = opts.deps ?? defaultDeps;
  const out = d.stdout;

  if (!(process.stdin as any).isTTY && !opts.deps) {
    process.stderr.write("setup requiere terminal interactiva. No funciona con pipes o CI.\n");
    process.exit(1);
  }

  out.write("\nWasapi MCP — setup wizard\n\n");

  // Step 1: browser
  out.write(`[1/4] Abriendo ${DASHBOARD_URL} en tu navegador...\n`);
  const opened = await d.openInBrowser(DASHBOARD_URL);
  if (!opened) {
    out.write(`      No pude abrir el navegador. Visítalo manualmente: ${DASHBOARD_URL}\n`);
  }
  out.write("      Inicia sesión si hace falta y copia tu API key.\n\n");

  // Step 2: key + validation
  let apiKey = "";
  let numbers: WhatsappNumber[] = [];
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const raw = await d.maskedQuestion("[2/4] Pega tu API key aquí: ");
    if (raw.length === 0) {
      out.write("      ✗ La key no puede estar vacía.\n");
      attempt--;
      continue;
    }
    out.write("      Validando contra Wasapi...\n");
    const result: ValidateResult = await d.validateKey(raw);
    if (result.ok) {
      apiKey = raw;
      numbers = result.numbers;
      out.write("      ✓ Key válida.\n\n");
      break;
    }
    out.write(`      ✗ ${result.message}\n`);
    if (attempt === MAX_ATTEMPTS) {
      out.write(`\nDespués de ${MAX_ATTEMPTS} intentos fallidos. Verifica tu key en ${DASHBOARD_URL}\n`);
      process.exit(1);
    }
  }

  // Step 3: from_id
  let fromId: number | null = null;
  if (numbers.length === 0) {
    out.write("[3/4] No tienes números conectados aún; podrás setear from_id después por env var o por parámetro.\n\n");
  } else if (numbers.length === 1) {
    fromId = Number(numbers[0].id);
    out.write(`[3/4] Default from_id = ${fromId} (único número en tu cuenta).\n\n`);
  } else {
    out.write(`[3/4] Encontré ${numbers.length} números de WhatsApp en tu cuenta:\n`);
    numbers.forEach((n, i) => out.write(formatNumber(n, i) + "\n"));
    const pick = await d.numberInRange(
      `      ¿Cuál usar como default? [1-${numbers.length}, o ENTER para no setear default]: `,
      1,
      numbers.length,
      { allowEmpty: true },
    );
    if (pick !== null) {
      fromId = Number(numbers[pick - 1].id);
      out.write(`      ✓ Default from_id = ${fromId}\n\n`);
    } else {
      out.write("      ✓ Sin default; especifícalo por tool call.\n\n");
    }
  }

  const entry = buildEntry(apiKey, fromId);

  // Step 4: write config (or print)
  if (opts.printOnly) {
    out.write("[4/4] --print-only: aquí está la entrada para pegar en tu claude_desktop_config.json:\n\n");
    out.write(JSON.stringify({ mcpServers: { wasapi: entry } }, null, 2) + "\n\n");
    return;
  }

  let cfgPath: string;
  try {
    cfgPath = d.resolveConfigPath({ platform: process.platform, env: process.env });
  } catch (e) {
    out.write(`[4/4] No pude detectar el path del config: ${(e as Error).message}\n`);
    out.write("      Pega esto manualmente en tu claude_desktop_config.json:\n\n");
    out.write(JSON.stringify({ mcpServers: { wasapi: entry } }, null, 2) + "\n\n");
    return;
  }

  out.write(`[4/4] Detecté Claude Desktop config en:\n      ${cfgPath}\n`);
  const confirm = await d.question("      ¿Configurar automáticamente? [Y/n]: ");
  const accepted = confirm === "" || /^y(es)?$/i.test(confirm);
  if (!accepted) {
    out.write("\n      Pega esto manualmente en tu claude_desktop_config.json:\n\n");
    out.write(JSON.stringify({ mcpServers: { wasapi: entry } }, null, 2) + "\n\n");
    return;
  }

  try {
    const result = d.writeWasapiEntry({ path: cfgPath, entry, overwrite: true });
    if (result.backupPath) {
      out.write(`      ✓ Backup guardado: ${result.backupPath}\n`);
    }
    out.write('      ✓ Entrada "wasapi" agregada.\n\n');
    out.write("Listo. Reinicia Claude Desktop (Cmd+Q + abrir) para activar el server.\n");
  } catch (e) {
    out.write(`      ✗ No pude escribir el config: ${(e as Error).message}\n`);
    out.write("      Sugerencia: corre 'wasapi-mcp setup --print-only' y pega el JSON manualmente.\n");
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/setup-orchestrator.test.ts && npm test`
Expected: orchestrator suite green, full repo green.

- [ ] **Step 5: Commit**

```bash
git add src/setup/index.ts tests/unit/setup-orchestrator.test.ts
git commit -m "feat(setup): wizard orchestrator (happy path)"
```

---

## Task 8: Edge cases — invalid key retries, overwrite prompt, decline write

Extend the orchestrator + tests for the explicit edge cases the spec requires.

**Files:**
- Modify: `src/setup/index.ts`
- Modify: `tests/unit/setup-orchestrator.test.ts` (add cases)

- [ ] **Step 1: Add failing edge-case tests**

Append to `tests/unit/setup-orchestrator.test.ts`:

```ts
describe("runSetup edge cases", () => {
  it("retries after invalid key (max 3) then exits", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
      throw new Error("__exit__");
    }) as any);
    deps.maskedQuestion
      .mockResolvedValueOnce("bad1")
      .mockResolvedValueOnce("bad2")
      .mockResolvedValueOnce("bad3");
    deps.validateKey
      .mockResolvedValueOnce({ ok: false, category: "auth", message: "API key inválida" })
      .mockResolvedValueOnce({ ok: false, category: "auth", message: "API key inválida" })
      .mockResolvedValueOnce({ ok: false, category: "auth", message: "API key inválida" });
    await expect(runSetup({ printOnly: false, deps: deps as any })).rejects.toThrow("__exit__");
    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    exit.mockRestore();
  });

  it("declines auto-config: prints JSON, does not write", async () => {
    deps.maskedQuestion.mockResolvedValueOnce("key_abc");
    deps.question.mockResolvedValueOnce("n");
    await runSetup({ printOnly: false, deps: deps as any });
    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    const out = (deps.stdout.write as any).mock.calls.map((c: any[]) => c[0]).join("");
    expect(out).toContain('"WASAPI_API_KEY": "key_abc"');
  });

  it("network error during validation exits without saving", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
      throw new Error("__exit__");
    }) as any);
    deps.maskedQuestion.mockResolvedValue("k");
    deps.validateKey.mockResolvedValue({ ok: false, category: "network", message: "No pude contactar a Wasapi" });
    await expect(runSetup({ printOnly: false, deps: deps as any })).rejects.toThrow("__exit__");
    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});
```

- [ ] **Step 2: Run, expect failures** (the network-error one is the only new behavior we need; the retry and decline cases should already pass if Task 7 was implemented correctly)

Run: `npm test -- tests/unit/setup-orchestrator.test.ts`

- [ ] **Step 3: Add network-error short-circuit in `src/setup/index.ts`**

Inside the `for (let attempt...)` loop in `runSetup`, immediately after the failing result is logged, add a check:

```ts
if (!result.ok && (result.category === "network" || result.category === "rate_limit" || result.category === "server")) {
  out.write(`\nNo se puede continuar (${result.category}). Intenta más tarde.\n`);
  process.exit(1);
}
```

Insert this BEFORE the `if (attempt === MAX_ATTEMPTS)` line. This way, transient errors don't burn through retry attempts.

Full updated loop body (replace the existing one):

```ts
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const raw = await d.maskedQuestion("[2/4] Pega tu API key aquí: ");
  if (raw.length === 0) {
    out.write("      ✗ La key no puede estar vacía.\n");
    attempt--;
    continue;
  }
  out.write("      Validando contra Wasapi...\n");
  const result: ValidateResult = await d.validateKey(raw);
  if (result.ok) {
    apiKey = raw;
    numbers = result.numbers;
    out.write("      ✓ Key válida.\n\n");
    break;
  }
  out.write(`      ✗ ${result.message}\n`);
  if (result.category === "network" || result.category === "rate_limit" || result.category === "server") {
    out.write(`\nNo se puede continuar (${result.category}). Intenta más tarde.\n`);
    process.exit(1);
  }
  if (attempt === MAX_ATTEMPTS) {
    out.write(`\nDespués de ${MAX_ATTEMPTS} intentos fallidos. Verifica tu key en ${DASHBOARD_URL}\n`);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test`
Expected: full suite green, including the 3 new edge cases.

- [ ] **Step 5: Commit**

```bash
git add src/setup/index.ts tests/unit/setup-orchestrator.test.ts
git commit -m "feat(setup): handle invalid-key retries, decline-write, transient errors"
```

---

## Task 9: README + manual smoke doc

**Files:**
- Modify: `README.md`
- Create: `docs/setup-smoke.md`
- Modify: `package.json` (bump version to 0.2.0)

- [ ] **Step 1: Update `README.md`**

Replace the "Install" section with:

```markdown
## Install (recommended)

Run the interactive setup wizard:

```bash
npx -y @wasapi/mcp-server setup
```

It opens your Wasapi dashboard, validates your API key against the live API, picks a default WhatsApp number if you have one, and writes the entry into your Claude Desktop config. Restart Claude Desktop and you're done.

## Install (manual)

If you prefer not to use the wizard:

1. Get your API key at https://app.wasapi.io/account/developer
2. Add this to your `claude_desktop_config.json`:

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

3. Restart Claude Desktop.

You can also run `npx -y @wasapi/mcp-server setup --print-only` to get the JSON block tailored to your account without touching any files.
```

- [ ] **Step 2: Write `docs/setup-smoke.md`**

```markdown
# Setup Wizard — Manual Smoke Checklist

Run before each release. Each step should produce the expected outcome with no manual fixups.

## Prep
- Pin a known-good API key in `WASAPI_TEST_API_KEY` (use a sandbox/staging account).
- Have a scratch dir for fake `claude_desktop_config.json`: `export CLAUDE_DESKTOP_CONFIG=/tmp/smoke-config.json`.

## Cases

### 1. Fresh install
- `rm -f /tmp/smoke-config.json`
- `node dist/index.js setup`
- Paste your API key.
- Expect: wizard runs, file is created at `/tmp/smoke-config.json` with `mcpServers.wasapi` entry.

### 2. Coexistence with other MCPs
- Pre-populate: `echo '{"mcpServers":{"other":{"command":"x"}}}' > /tmp/smoke-config.json`
- `node dist/index.js setup` and accept auto-config.
- Expect: `other` still present, `wasapi` added alongside.

### 3. Existing wasapi entry — overwrite
- With config from case 2, re-run `node dist/index.js setup`.
- Expect: prompt confirms overwrite, backup created, entry replaced.

### 4. Non-TTY rejection
- `echo '' | node dist/index.js setup`
- Expect: immediate exit 1 with TTY error message.

### 5. --print-only
- `node dist/index.js setup --print-only`
- Paste API key.
- Expect: JSON printed to stdout, `/tmp/smoke-config.json` untouched.

### 6. Browser fallback
- Force browser failure: `unset PATH; PATH=/usr/bin node dist/index.js setup` (or another env where `open`/`xdg-open` isn't found).
- Expect: wizard continues, prints URL for manual visit.
```

- [ ] **Step 3: Bump version in `package.json`**

Change `"version": "0.1.0"` to `"version": "0.2.0"`.

- [ ] **Step 4: Build and verify**

Run: `npm run build && npm test && npm run typecheck`
Expected: all green.

- [ ] **Step 5: Verify pack still clean**

Run: `npm pack --dry-run | grep -c "DS_Store"; npm pack --dry-run | grep -E "(src/|tests/|docs/)" | head`
Expected: `0`, no `src/`/`tests/`/`docs/` lines printed.

- [ ] **Step 6: Commit and tag**

```bash
git add README.md docs/setup-smoke.md package.json
git commit -m "docs: README rewrite for setup wizard + smoke checklist + v0.2.0"
git tag v0.2.0
```
