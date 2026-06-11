# Wasapi MCP Server — Design Spec

**Date:** 2026-06-10
**Status:** Approved (brainstorming phase)
**Owner:** juanpablo@wasapi.io

## 1. Purpose

Build a distributable MCP (Model Context Protocol) server that lets Claude operate a user's Wasapi account: manage contacts, send WhatsApp messages, and inspect conversations. Published to npm so any Claude Desktop / Claude Code user can install it with their own Wasapi API key.

## 2. Non-goals (v1)

- Interactive OAuth or password login (Wasapi uses static API keys).
- Coverage of `campaigns`, `flows`, `labels` (read/write beyond contact tagging), `metrics`, `workflow` modules. Out of scope for MVP; will be added based on real usage feedback.
- Caching, automatic retries, or rate-limit backoff.
- High-level "smart" tools that compose multiple SDK calls.

## 3. Architecture

### Stack
- **Runtime:** Node.js ≥20, TypeScript
- **MCP framework:** `@modelcontextprotocol/sdk` (official)
- **Wasapi client:** `@wasapi/js-sdk` (SDK-first; gaps are filled by PR-ing the SDK, not by falling back to raw REST)
- **Validation:** `zod`
- **Transport:** stdio
- **Test runner:** `vitest`

### Directory structure
```
src/
  index.ts              # entrypoint: registers tools, starts stdio server
  server.ts             # MCP Server instance + wiring
  config.ts             # env var loading + zod validation
  wasapi.ts             # singleton WasapiClient
  tools/
    contacts/
      list.ts
      get.ts
      create.ts
      update.ts
      delete.ts
      add-label.ts
      remove-label.ts
    whatsapp/
      list-numbers.ts
      send-message.ts
      send-template.ts
      send-attachment.ts
      list-conversations.ts
      get-conversation.ts
    index.ts            # aggregator
  lib/
    register-tool.ts    # zod schema → MCP tool + uniform error wrap
    errors.ts           # SDK/API error → MCP error mapper
tests/
  unit/                 # per-tool handler tests (SDK mocked)
  contracts/            # SDK response shape contract tests
  integration/          # opt-in; requires WASAPI_TEST_API_KEY
docs/
  superpowers/specs/
```

### Design principles
- Each tool is an isolated module exporting `{ name, description, schema, handler }`.
- The `register-tool` helper standardizes registration: zod input validation, error mapping, response shaping.
- **Tools never call other tools.** Multi-step flows are orchestrated by the model.
- A single `WasapiClient` instance lives in `wasapi.ts` and is imported by all tools. No per-call re-instantiation.

## 4. Tool inventory (v1)

13 tools, all snake_case, one per SDK endpoint.

### `contacts` module
| Tool | Required params | Optional params |
|---|---|---|
| `list_contacts` | — | `page`, `per_page`, `search` |
| `get_contact` | `contact_id` | — |
| `create_contact` | `phone` | `first_name`, `last_name`, `email`, `custom_fields` |
| `update_contact` | `contact_id` | all fields above |
| `delete_contact` | `contact_id` | — |
| `add_label_to_contact` | `contact_id`, `label_id` | — |
| `remove_label_from_contact` | `contact_id`, `label_id` | — |

### `whatsapp` module
| Tool | Required params | Optional params |
|---|---|---|
| `list_whatsapp_numbers` | — | — |
| `send_message` | `to`, `message` | `from_id` |
| `send_template` | `to`, `template_name` | `variables`, `from_id` |
| `send_attachment` | `to`, `url`, `type` (image/document/audio/video) | `caption`, `from_id` |
| `list_conversations` | — | `page`, `status` |
| `get_conversation` | `conversation_id` | pagination params if SDK exposes |

**`from_id` behavior:** the tools accept it as optional. If absent, the handler uses `WASAPI_FROM_ID` from config. If neither is set, the tool returns a validation error directing the user to either set the env var or pass `from_id` explicitly (and to call `list_whatsapp_numbers` to discover IDs).

**Gap handling:** if `@wasapi/js-sdk` does not expose any of these endpoints, the missing piece is filed as an issue/PR against the SDK. No raw REST fallback in the MCP.

## 5. Configuration

### Environment variables
| Variable | Required | Purpose |
|---|---|---|
| `WASAPI_API_KEY` | yes | Wasapi API key |
| `WASAPI_FROM_ID` | no | Default sender ID for send_* tools |
| `WASAPI_BASE_URL` | no | Override SDK base URL (staging/testing) |
| `WASAPI_DEBUG` | no | `1` enables debug logs to stderr |

### Startup behavior
- `config.ts` validates env vars with zod at process start.
- Missing `WASAPI_API_KEY` → fail fast with: `"Missing WASAPI_API_KEY. Get yours at https://app.wasapi.io/..."`. The server does not start.
- Missing `WASAPI_FROM_ID` is valid; send_* tool descriptions reflect that `from_id` is required per-call.

### Installation surface (documented in README)
Publish as `@wasapi/mcp-server` on npm. Users add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "wasapi": {
      "command": "npx",
      "args": ["-y", "@wasapi/mcp-server"],
      "env": {
        "WASAPI_API_KEY": "...",
        "WASAPI_FROM_ID": "..."
      }
    }
  }
}
```

## 6. Error handling

### Validation
- Input: zod schema validated by `register-tool` before handler runs. Schema errors return `isError: true` with a precise message (e.g. `"phone is required and must be in E.164 format"`).
- Output: SDK return values are serialized to JSON inside an MCP `text` content block.

### Error mapping (`lib/errors.ts`)
| Category | Source | Model-facing message |
|---|---|---|
| `auth` | 401, 403 | "API key inválida o sin permisos para este recurso" |
| `not_found` | 404 | "Recurso no encontrado: {detail}" |
| `validation` | 422 | "Datos inválidos: {field: error}" (from API body) |
| `rate_limit` | 429 | "Rate limit alcanzado. Reintentar en {retry-after}s" |
| `server` | 5xx | "Error del servidor Wasapi: {message}. Reintentable." |
| `network` | timeout, ECONNREFUSED | "No se pudo contactar a Wasapi" |
| `unknown` | catch-all | Original message + error type |

### Rules
- Tool failures never crash the server.
- No automatic retries — the model decides whether to retry.
- No response sanitization — return what the SDK gives.
- No caching in v1.

### Logging
- All logs go to **stderr** (stdout is reserved for MCP protocol on stdio).
- Default level: errors only. `WASAPI_DEBUG=1` enables debug.
- Never log: API key, full message bodies.

## 7. Testing strategy

### Unit tests (primary)
- One spec file per tool. Mock the Wasapi client.
- Coverage: schema validation paths, success serialization, each error category mapping.

### Contract tests
- Live in `tests/contracts/`. Verify the SDK response shapes the tools depend on.
- Built from documented/recorded responses. If the SDK changes a shape, these fail → signal to bump the dep version intentionally.

### Integration tests (opt-in)
- Live in `tests/integration/`. Skipped unless `WASAPI_TEST_API_KEY` is set.
- Smoke coverage: server boot, one read tool, one write tool. Run manually before release; not in CI.

### Out of scope
- Testing the SDK itself.
- Testing the MCP protocol layer.
- Hitting Wasapi from CI.

### npm scripts
```
test              → vitest run
test:watch        → vitest
test:integration  → vitest run tests/integration/
typecheck         → tsc --noEmit
lint              → (eslint or biome — decide at implementation time)
build             → tsc -p tsconfig.build.json
```

## 8. Release plan

- **v0.1.0:** all 13 tools above, published to npm as `@wasapi/mcp-server`, README with install/config instructions.
- Subsequent versions: expand coverage module-by-module based on actual usage signals (issues, internal feedback).

## 9. Open questions (to resolve during implementation)

- Exact shape of `variables` for `send_template` (depends on Wasapi's template engine — confirm against live API).
- Whether `get_conversation` supports message-level pagination in the current SDK; if not, decide between truncating responses or filing an SDK gap.
- Whether to use ESLint or Biome for linting.
