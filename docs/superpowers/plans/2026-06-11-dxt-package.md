# DXT Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a `.dxt` (Desktop Extension) bundle of the Wasapi MCP server that can be installed in Claude Desktop via double-click — no terminal required.

**Architecture:** Self-contained ZIP archive containing `dist/`, pruned `node_modules/`, `manifest.json` (DXT spec), `icon.png`, and `README.md`. A Node script (`scripts/build-dxt.mjs`) orchestrates the build deterministically. A second script (`scripts/generate-manifest.mjs`) builds the manifest from `package.json` so version stays in sync.

**Tech Stack:** Node.js, TypeScript, `archiver` (new devDep for ZIP creation), `zod` (manifest validation). No runtime additions.

**Spec:** `docs/superpowers/specs/2026-06-11-dxt-package-design.md`

---

## Task 1: Manifest generator + zod schema

Pure function: `package.json` contents → DXT manifest object. Zod schema validates the manifest shape and required fields.

**Files:**
- Create: `scripts/generate-manifest.mjs`
- Create: `tests/unit/generate-manifest.test.ts`

- [ ] **Step 1: Add `release/` to `.gitignore`**

Edit `.gitignore` to add the line `release/` at the end. (If already present, skip.)

```
node_modules
dist
.env
.env.*
*.log
.DS_Store
release/
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/generate-manifest.test.ts
import { describe, it, expect } from "vitest";
import { buildManifest, manifestSchema } from "../../scripts/generate-manifest.mjs";

const pkgFixture = {
  name: "@jpabloe/wasapi-mcp-server",
  version: "0.3.0",
  description: "MCP server for Wasapi — manage contacts and send WhatsApp messages via Claude",
  author: { name: "Juan Pablo", email: "juanpablo@vinixcode.com", url: "https://github.com/jpabloe" },
  repository: { type: "git", url: "git+https://github.com/jpabloe/wasapi-mcp-server.git" },
  license: "ISC",
};

describe("buildManifest", () => {
  it("syncs version from package.json", () => {
    const m = buildManifest(pkgFixture);
    expect(m.version).toBe("0.3.0");
  });

  it("uses author info from package.json", () => {
    const m = buildManifest(pkgFixture);
    expect(m.author.name).toBe("Juan Pablo");
    expect(m.author.email).toBe("juanpablo@vinixcode.com");
  });

  it("declares all 12 tools", () => {
    const m = buildManifest(pkgFixture);
    const names = m.tools.map((t) => t.name);
    expect(names).toEqual([
      "list_contacts", "get_contact", "create_contact", "update_contact",
      "delete_contact", "add_label_to_contact", "remove_label_from_contact",
      "list_whatsapp_numbers", "send_message", "send_template",
      "send_attachment", "get_conversation",
    ]);
  });

  it("api_key user_config is sensitive and required", () => {
    const m = buildManifest(pkgFixture);
    expect(m.user_config.api_key.sensitive).toBe(true);
    expect(m.user_config.api_key.required).toBe(true);
  });

  it("server entry_point and mcp_config wire API key through env", () => {
    const m = buildManifest(pkgFixture);
    expect(m.server.entry_point).toBe("dist/index.js");
    expect(m.server.mcp_config.command).toBe("node");
    expect(m.server.mcp_config.args).toEqual(["${__dirname}/dist/index.js"]);
    expect(m.server.mcp_config.env.WASAPI_API_KEY).toBe("${user_config.api_key}");
  });

  it("output passes manifestSchema validation", () => {
    const m = buildManifest(pkgFixture);
    expect(() => manifestSchema.parse(m)).not.toThrow();
  });

  it("manifestSchema rejects a manifest missing required fields", () => {
    expect(() => manifestSchema.parse({ name: "x" })).toThrow();
  });

  it("derives homepage/documentation/support from repository URL", () => {
    const m = buildManifest(pkgFixture);
    expect(m.homepage).toBe("https://github.com/jpabloe/wasapi-mcp-server");
    expect(m.documentation).toBe("https://github.com/jpabloe/wasapi-mcp-server#readme");
    expect(m.support).toBe("https://github.com/jpabloe/wasapi-mcp-server/issues");
  });
});
```

- [ ] **Step 3: Run test, expect failure**

Run: `npm test -- tests/unit/generate-manifest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `scripts/generate-manifest.mjs`**

```js
// scripts/generate-manifest.mjs
import { z } from "zod";

const TOOLS = [
  { name: "list_contacts", description: "List contacts (paginated, optional search)" },
  { name: "get_contact", description: "Fetch a contact by wa_id" },
  { name: "create_contact", description: "Create a new contact" },
  { name: "update_contact", description: "Update an existing contact" },
  { name: "delete_contact", description: "Delete a contact" },
  { name: "add_label_to_contact", description: "Attach a label to a contact" },
  { name: "remove_label_from_contact", description: "Detach a label from a contact" },
  { name: "list_whatsapp_numbers", description: "List WhatsApp numbers connected to the account" },
  { name: "send_message", description: "Send a plain-text WhatsApp message" },
  { name: "send_template", description: "Send an approved WhatsApp template" },
  { name: "send_attachment", description: "Send a file attachment from a local path" },
  { name: "get_conversation", description: "Fetch the message thread with a contact" },
];

export const manifestSchema = z.object({
  dxt_version: z.literal("0.1"),
  name: z.string().min(1),
  display_name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().min(1),
  long_description: z.string().min(1),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
  homepage: z.string().url(),
  documentation: z.string().url(),
  support: z.string().url(),
  license: z.string(),
  keywords: z.array(z.string()),
  icon: z.string(),
  server: z.object({
    type: z.literal("node"),
    entry_point: z.string(),
    mcp_config: z.object({
      command: z.string(),
      args: z.array(z.string()),
      env: z.record(z.string(), z.string()),
    }),
  }),
  user_config: z.record(
    z.string(),
    z.object({
      type: z.string(),
      title: z.string(),
      description: z.string(),
      sensitive: z.boolean().optional(),
      required: z.boolean().optional(),
    }),
  ),
  tools: z.array(z.object({ name: z.string(), description: z.string() })),
  compatibility: z.object({
    claude_desktop: z.string(),
    platforms: z.array(z.string()),
    runtimes: z.record(z.string(), z.string()),
  }),
});

function repoUrlToHttps(url) {
  if (!url) return "https://github.com/jpabloe/wasapi-mcp-server";
  return url
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\/git@/, "https://")
    .replace(/\.git$/, "");
}

export function buildManifest(pkg) {
  const homepage = repoUrlToHttps(pkg.repository?.url);
  const author = typeof pkg.author === "string"
    ? { name: pkg.author }
    : (pkg.author ?? { name: "Unknown" });

  return {
    dxt_version: "0.1",
    name: "wasapi-mcp",
    display_name: "Wasapi",
    version: pkg.version,
    description: "Manage WhatsApp contacts and send messages via your Wasapi account",
    long_description: "Connects Claude to your Wasapi WhatsApp Business account. Send messages, manage contacts, fetch conversations — all in natural language. Get your API key at https://app.wasapi.io/account/developer",
    author,
    homepage,
    documentation: `${homepage}#readme`,
    support: `${homepage}/issues`,
    license: pkg.license ?? "ISC",
    keywords: ["wasapi", "whatsapp", "messaging", "crm"],
    icon: "icon.png",
    server: {
      type: "node",
      entry_point: "dist/index.js",
      mcp_config: {
        command: "node",
        args: ["${__dirname}/dist/index.js"],
        env: { WASAPI_API_KEY: "${user_config.api_key}" },
      },
    },
    user_config: {
      api_key: {
        type: "string",
        title: "Wasapi API Key",
        description: "Tu API key personal. Consíguela en https://app.wasapi.io/account/developer",
        sensitive: true,
        required: true,
      },
    },
    tools: TOOLS,
    compatibility: {
      claude_desktop: ">=0.10.0",
      platforms: ["darwin", "win32", "linux"],
      runtimes: { node: ">=20.0.0" },
    },
  };
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test -- tests/unit/generate-manifest.test.ts && npm run typecheck`
Expected: 8 passing, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-manifest.mjs tests/unit/generate-manifest.test.ts .gitignore
git commit -m "feat(dxt): manifest generator + zod schema"
```

---

## Task 2: Build script

`scripts/build-dxt.mjs` orchestrates: clean → build → stage → install prod deps → write manifest → ZIP.

**Files:**
- Create: `scripts/build-dxt.mjs`
- Modify: `package.json` (add `archiver` devDep, add `package:dxt` script)

- [ ] **Step 1: Install `archiver` as a devDep**

Run:
```bash
npm install -D archiver
```
Expected: `archiver` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Add the `package:dxt` script to `package.json`**

In the `"scripts"` block, add:
```json
"package:dxt": "node scripts/build-dxt.mjs"
```

- [ ] **Step 3: Implement `scripts/build-dxt.mjs`**

```js
// scripts/build-dxt.mjs
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, createWriteStream } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";
import { buildManifest, manifestSchema } from "./generate-manifest.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(repoRoot, "release");
const stageDir = join(releaseDir, "wasapi-mcp");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: repoRoot, ...opts });
}

function log(msg) {
  process.stdout.write(`[build-dxt] ${msg}\n`);
}

function step1_clean() {
  log("Cleaning release/");
  rmSync(releaseDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });
}

function step2_build() {
  log("Building TypeScript");
  rmSync(join(repoRoot, "dist"), { recursive: true, force: true });
  run("npm run build");
  run("find dist -name .DS_Store -delete");
}

function step3_copyDist() {
  log("Copying dist/ to stage");
  cpSync(join(repoRoot, "dist"), join(stageDir, "dist"), { recursive: true });
}

function step4_installProdDeps() {
  log("Installing production dependencies (this takes a moment)");
  const pkgPath = join(repoRoot, "package.json");
  cpSync(pkgPath, join(stageDir, "package.json"));
  run("npm install --omit=dev --no-package-lock --silent", { cwd: stageDir });
  rmSync(join(stageDir, "package.json"));
}

function step5_copyAssets() {
  log("Copying icon and README");
  cpSync(join(repoRoot, "assets", "icon.png"), join(stageDir, "icon.png"));
  cpSync(join(repoRoot, "README.md"), join(stageDir, "README.md"));
}

function step6_writeManifest() {
  log("Generating manifest.json");
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const manifest = buildManifest(pkg);
  manifestSchema.parse(manifest); // throws if invalid
  writeFileSync(join(stageDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest.version;
}

function step7_zip(version) {
  const outPath = join(releaseDir, `wasapi-mcp-${version}.dxt`);
  log(`Creating ZIP: ${outPath}`);
  return new Promise((resolveZip, rejectZip) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolveZip(outPath));
    archive.on("error", rejectZip);
    archive.pipe(output);
    archive.directory(stageDir + "/", false);
    archive.finalize();
  });
}

async function main() {
  step1_clean();
  step2_build();
  step3_copyDist();
  step4_installProdDeps();
  step5_copyAssets();
  const version = step6_writeManifest();
  const outPath = await step7_zip(version);
  const size = statSync(outPath).size;
  log(`Done. ${outPath} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  process.stderr.write(`[build-dxt] FAILED: ${err?.message ?? err}\n`);
  process.exit(1);
});
```

- [ ] **Step 4: Run the build**

Run: `npm run package:dxt`
Expected: prints step logs, ends with `Done. .../release/wasapi-mcp-0.2.3.dxt (X.XX MB)`. No errors.

- [ ] **Step 5: Inspect the artifact**

Run:
```bash
ls -la release/
unzip -l release/wasapi-mcp-*.dxt | head -30
unzip -l release/wasapi-mcp-*.dxt | grep -E "manifest.json|icon.png|dist/index.js|node_modules/@modelcontextprotocol"
```
Expected:
- `release/wasapi-mcp-X.Y.Z.dxt` exists, size 3-7 MB
- Listing shows `manifest.json`, `icon.png`, `dist/index.js`, `node_modules/@modelcontextprotocol/...`

- [ ] **Step 6: Run full test suite (sanity)**

Run: `npm test`
Expected: 124+ passing (we added 8 in Task 1).

- [ ] **Step 7: Commit**

```bash
git add scripts/build-dxt.mjs package.json package-lock.json
git commit -m "feat(dxt): build script produces self-contained .dxt archive"
```

---

## Task 3: Smoke checklist doc

**Files:**
- Create: `docs/dxt-smoke.md`

- [ ] **Step 1: Write the smoke doc**

```markdown
# DXT Package — Manual Smoke Checklist

Run before publishing each release of the `.dxt`.

## Build
1. From repo root: `npm run package:dxt`
2. Expect: clean exit, prints `Done. release/wasapi-mcp-<version>.dxt (X.XX MB)`

## Archive inspection
3. `unzip -l release/wasapi-mcp-*.dxt | head -30`
   - Must include: `manifest.json`, `icon.png`, `dist/index.js`, `dist/server.js`, `node_modules/@modelcontextprotocol/sdk/`, `node_modules/@wasapi/js-sdk/`, `node_modules/zod/`, `node_modules/zod-to-json-schema/`, `README.md`
4. Size between 3 and 7 MB. If > 15 MB, investigate: probably devDependencies leaked.
5. `unzip -p release/wasapi-mcp-*.dxt manifest.json | jq .version` must match `package.json#version`.

## Claude Desktop install (macOS)
6. Double-click `release/wasapi-mcp-<version>.dxt`.
7. Claude Desktop opens an install dialog.
8. Confirm: Wasapi logo, name "Wasapi", short description, all 12 tools listed.
9. Single form field "Wasapi API Key" appears, masked.
10. Paste a real API key. Click Install.
11. Open a new chat. Click the tools icon. Confirm "wasapi" appears with 12 tools.
12. Ask Claude: *"Lista mis números de WhatsApp"*. Expect a sensible response.

## Uninstall
13. From Claude Desktop → MCP settings → uninstall "wasapi".
14. Confirm the entry disappears. No leftover files in `~/Library/Application Support/Claude/`.

## Cross-platform (deferred)
- Windows and Linux smoke are out of scope for v0.3.0. Add to this checklist when those channels open.
```

- [ ] **Step 2: Commit**

```bash
git add docs/dxt-smoke.md
git commit -m "docs: DXT manual smoke checklist"
```

---

## Task 4: README updates

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Insert the new "Install for Claude Desktop" section**

Locate the existing `## Quick start (30 seconds)` heading in `README.md`. Replace it (and the paragraph immediately below it) with:

```markdown
## Install for Claude Desktop (no terminal)

1. Download **[wasapi-mcp.dxt](https://github.com/jpabloe/wasapi-mcp-server/releases/latest)** from the latest release.
2. Double-click the file — Claude Desktop opens an install dialog.
3. Paste your Wasapi API key (get one at [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer)).
4. Click **Install**. Restart Claude Desktop if it asks. Done.

> Works only with Claude Desktop. For Cursor, Claude Code, and other MCP clients, use the developer install below.

## Install for developers (30 seconds)

Run the interactive setup wizard:

```bash
npx -y @jpabloe/wasapi-mcp-server setup --restart
```

The wizard:
1. Opens your Wasapi dashboard so you can copy your API key
2. Validates the key against the live API
3. Picks a default WhatsApp number (if you have one)
4. Detects your MCP client (Claude Desktop / Cursor) and writes the config
5. Restarts the app for you (with `--restart`)
```

- [ ] **Step 2: Verify the rest of the README still renders well**

Run: `wc -l README.md` (sanity — should be similar to before, ~230 lines).
Skim it manually: headings flow, no orphan content, links work.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(README): add Install for Claude Desktop (DXT) section"
```

---

## Task 5: First DXT release

This is a manual operations task. The plan documents the sequence so the engineer can execute it cleanly.

**Files:** none (operational only)

- [ ] **Step 1: Confirm clean state**

```bash
git status
```
Expected: clean tree, on `main`, ahead of `origin` only by the commits from Tasks 1-4.

- [ ] **Step 2: Push commits and tags**

```bash
git push --follow-tags
```

- [ ] **Step 3: Bump version**

```bash
npm version minor
```
Expected: version goes from `0.2.3` → `0.3.0`, new commit `0.3.0`, new tag `v0.3.0`.

- [ ] **Step 4: Push the new tag**

```bash
git push --follow-tags
```

- [ ] **Step 5: Publish to npm**

```bash
npm publish --access public --otp=<6-digit code from your authenticator>
```
Expected: `npm notice published @jpabloe/wasapi-mcp-server@0.3.0` and similar.

- [ ] **Step 6: Build the DXT**

```bash
npm run package:dxt
```
Expected: `release/wasapi-mcp-0.3.0.dxt` created.

- [ ] **Step 7: Run the smoke checklist**

Walk through `docs/dxt-smoke.md` end-to-end. Fix anything broken before proceeding. Do not skip — the install dialog in Claude Desktop is the only way to validate the manifest renders correctly.

- [ ] **Step 8: Create GitHub release with the DXT attached**

```bash
gh release create v0.3.0 \
  release/wasapi-mcp-0.3.0.dxt \
  --title "v0.3.0 — Desktop Extension support" \
  --notes "Adds a .dxt bundle for one-click install in Claude Desktop. Download wasapi-mcp-0.3.0.dxt below, double-click it, paste your Wasapi API key, and Claude Desktop handles the rest. No terminal required."
```
Expected: prints the release URL. Open it; confirm the `.dxt` is listed under Assets.

- [ ] **Step 9: Verify the always-latest download URL**

Run:
```bash
curl -sLI https://github.com/jpabloe/wasapi-mcp-server/releases/latest/download/wasapi-mcp-0.3.0.dxt | head -1
```
Expected: `HTTP/2 200` (or a 302 → 200 chain). Means the link in the README resolves to a real file.

- [ ] **Step 10: Final sanity**

Send the GitHub release URL to a teammate (or yourself on another machine), have them follow the README's "Install for Claude Desktop" section, and confirm it works end-to-end from a fresh install.
