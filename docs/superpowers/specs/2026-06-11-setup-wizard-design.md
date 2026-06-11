# Setup Wizard — Design Spec

**Date:** 2026-06-11
**Status:** Approved (brainstorming phase)
**Owner:** juanpablo@wasapi.io
**Relates to:** [Wasapi MCP Server v0.1](./2026-06-10-wasapi-mcp-design.md)

## 1. Purpose

Lower the install friction for non-technical users. Today, getting `@wasapi/mcp-server` running requires the user to: find the API key in the Wasapi dashboard, locate `claude_desktop_config.json` on their OS, paste a JSON block correctly, restart Claude Desktop. The setup wizard collapses that to a single command:

```
npx -y @wasapi/mcp-server setup
```

After running it, the user only restarts Claude Desktop. No JSON editing, no path hunting, no copy-paste mistakes.

## 2. Non-goals (v0.2)

- OAuth flow against Wasapi (Wasapi has no third-party OAuth today).
- Browser-based key entry (the user pastes into the terminal, no local web server).
- Auto-update of `claude_desktop_config.json` when the user rotates their key (a future `wasapi-mcp rotate-key` could do this — out of scope here).
- TUI/ink-style UI. Plain readline only.
- Detecting / supporting Claude Code's `mcp` config — only Claude Desktop's `claude_desktop_config.json`.

## 3. User flow (happy path)

```
$ npx -y @wasapi/mcp-server setup

Wasapi MCP — setup wizard

[1/4] Abriendo https://app.wasapi.io/account/developer en tu navegador...
      Inicia sesión si hace falta y copia tu API key.
      (Si el navegador no abre, copia la URL manualmente.)

[2/4] Pega tu API key aquí: ********************************
      Validando contra Wasapi...
      ✓ Key válida.

[3/4] Encontré 2 números de WhatsApp en tu cuenta:
        1) +57 300 123 4567   (id: 12345)
        2) +57 310 987 6543   (id: 67890)
      ¿Cuál usar como default? [1-2, o ENTER para no setear default]: 1
      ✓ Default from_id = 12345

[4/4] Detecté Claude Desktop config en:
      /Users/nova/Library/Application Support/Claude/claude_desktop_config.json
      ¿Configurar automáticamente? [Y/n]: y
      ✓ Backup guardado: claude_desktop_config.json.bak-2026-06-11T10-30-00
      ✓ Entrada "wasapi" agregada.

Listo. Reinicia Claude Desktop (Cmd+Q + abrir) para activar el server.
```

### Variations
- **0 WhatsApp numbers:** skip step [3], inform: *"No tienes números conectados aún; podrás setear from_id después por env var o por parámetro."*
- **Exactly 1 number:** auto-select, do not prompt. *"Default from_id = X (único número en tu cuenta)."*
- **User declines auto-config in [4]:** print the JSON block they should paste, with the config path it belongs in. No disk writes.
- **`wasapi` entry already exists:** prompt: *"Ya hay un MCP llamado 'wasapi' configurado. ¿Sobrescribir? [y/N]"*

## 4. Architecture

### Subcommand routing
Single binary, dispatched on `process.argv[2]`:

| Invocation | Behavior |
|---|---|
| `wasapi-mcp` | Boot MCP server (current behavior, no change) |
| `wasapi-mcp setup` | Run interactive wizard |
| `wasapi-mcp setup --print-only` | Run wizard up to step 3, then print JSON without touching disk |
| `wasapi-mcp --version` | Print `package.json` version, exit 0 |
| `wasapi-mcp --help` | Print usage, exit 0 |
| `wasapi-mcp <anything else>` | Print usage, exit 1 |

`src/index.ts` adds the dispatcher at the top. `setup` is imported dynamically so the MCP server boot path doesn't pay the cost.

### New module layout
```
src/setup/
  index.ts          # orchestrates the wizard end-to-end
  prompt.ts         # readline wrapper: question(), maskedQuestion(), numberInRange()
  browser.ts        # opens a URL via OS-default browser
  config-path.ts    # resolves claude_desktop_config.json path per OS
  config-write.ts   # read → merge → backup → write
  validate-key.ts   # calls Wasapi to confirm key + list numbers
```

The MCP server (`src/server.ts`, `src/tools/...`) is **not modified**. The wizard is a sibling, not a layer.

## 5. Config file resolution

### Paths per OS

| OS | Default path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

### Override
Environment variable `CLAUDE_DESKTOP_CONFIG` (absolute path) overrides the default. Use cases: WSL, Claude Code, custom installs, tests.

### Merge algorithm
1. If file doesn't exist → start with `{}`.
2. If file exists but JSON is invalid → **abort**. Do not touch disk. Print the JSON block to paste manually + the line/column of the parse error.
3. Backup the original to `<config>.bak-<ISO timestamp with hyphens>`. Backup happens BEFORE write. Never overwrite an existing backup name (unique timestamp).
4. `config.mcpServers ??= {}`.
5. `config.mcpServers.wasapi = { command: "npx", args: ["-y", "@wasapi/mcp-server"], env: { WASAPI_API_KEY, WASAPI_FROM_ID? } }`. Omit `WASAPI_FROM_ID` if the user didn't pick one.
6. Write with `JSON.stringify(config, null, 2) + "\n"`.

### Exact entry written
```json
{
  "command": "npx",
  "args": ["-y", "@wasapi/mcp-server"],
  "env": {
    "WASAPI_API_KEY": "...",
    "WASAPI_FROM_ID": "12345"
  }
}
```

## 6. Validation (step 2)

- Call `client.whatsapp.getWhatsappNumbers()` with the candidate key.
- Success → store the returned list for step 3.
- Failure → use the existing `mapError` from `src/lib/errors.ts` for consistent messaging, then re-prompt (see §7).
- No retry on rate-limit; just message and exit (it's an interactive wizard, not a daemon).

The validation passes through the same SDK + error mapper the MCP runtime uses, so a key that passes setup will pass at runtime too.

## 7. Error handling

| Situation | Behavior |
|---|---|
| Empty/whitespace key | Re-prompt with *"La key no puede estar vacía."*. No retry counter. |
| Invalid key (401) | Show error-mapper message, re-prompt. **3 attempts max** → exit 1. |
| Rate limit (429) | Print message including retry-after, exit 1. |
| Network failure | *"No pude contactar a Wasapi."*, exit 1. Key not saved. |
| stdin not a TTY | Exit 1 immediately: *"setup requiere terminal interactiva."* |
| Browser fails to open | Non-blocking. Print URL and continue. |
| Config path not writable | Exit 1 with the FS error + hint about `--print-only`. |
| Invalid number selection (step 3) | Re-prompt without counter. |
| Ctrl+C anywhere | Exit 0 silently. Backup only happens in step 4, so there's nothing to clean. |

## 8. UX / output conventions

- All wizard output goes to **stdout** (this is the interactive command, not the stdio MCP server).
- Prefixes: `[N/4]`, `✓` (success), `✗` (error). No ANSI colors — keeps output usable in dumb terminals and CI logs.
- API key input is masked: keystrokes show as `*`. Implementation: raw mode + manual echo of `*` per keypress, finalized on `\n`.
- Trim aggressively before validation (whitespace, surrounding quotes accidentally pasted).

## 9. Testing

### Unit tests
| File under test | What's covered |
|---|---|
| `config-path.ts` | macOS/Win/Linux defaults; `CLAUDE_DESKTOP_CONFIG` override; missing `HOME`/`APPDATA` |
| `config-write.ts` | Empty config; config with other MCPs survives; overwrite-prompt yes/no; backup naming; invalid JSON → no write |
| `validate-key.ts` | Mocked SDK: success returns list, 401 throws auth, 429 throws rate_limit, network throws network |
| `prompt.ts` | Mocked stdin/stdout: question, masked question, numeric range validator |
| `setup/index.ts` | Mocked sub-modules: happy path, 3-strikes-out, declined auto-config, `--print-only`, 0/1/N numbers |

### Excluded
- Real browser opens (mock `browser.ts`).
- Real Wasapi calls in unit/CI (opt-in only via existing `tests/integration/`).
- True end-to-end against a real Claude Desktop (covered by manual smoke).

### Manual smoke (`docs/setup-smoke.md`)
Checklist used before each release:
1. Empty config → setup creates it with `wasapi` entry.
2. Config with another MCP → that MCP survives; `wasapi` is added alongside.
3. Config with existing `wasapi` → overwrite prompt appears; "no" aborts cleanly.
4. Non-TTY stdin (`echo '' | wasapi-mcp setup`) → exit 1 immediately.

### Test count delta
~25–30 new unit tests + 1 smoke doc. Repo goes from 64 → ~90 tests.

## 10. Release plan

- **v0.2.0:** ship the setup wizard. README's installation section becomes: *"Run `npx -y @wasapi/mcp-server setup` and follow the prompts."* The manual JSON-paste path stays documented as the fallback.
- The MCP server itself does not change in v0.2.

## 11. Open questions

- Whether the README should still document the manual JSON path or only show the wizard command. Default: keep both, with wizard first.
- Whether to detect Claude Code's MCP config (`.claude/mcp.json` or similar) and offer to also write there. Out of scope for v0.2; could be a v0.3 flag like `--target claude-code`.
