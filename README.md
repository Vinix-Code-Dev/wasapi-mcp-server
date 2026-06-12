# @jpabloe/wasapi-mcp-server

[![npm version](https://img.shields.io/npm/v/@jpabloe/wasapi-mcp-server.svg)](https://www.npmjs.com/package/@jpabloe/wasapi-mcp-server)
[![license](https://img.shields.io/npm/l/@jpabloe/wasapi-mcp-server.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@jpabloe/wasapi-mcp-server.svg)](https://nodejs.org)

> **Manage your [Wasapi](https://wasapi.io) WhatsApp Business account directly from Claude, Cursor, or any MCP-compatible client.** Send messages, manage contacts, fetch conversations — all via natural language.

---

## Install for Claude Desktop (no terminal)

1. Download **[wasapi-mcp.dxt](https://github.com/jpabloe/wasapi-mcp-server/releases/latest/download/wasapi-mcp.dxt)** (direct link, always the latest version).
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

---

## What can I do with it?

Once installed, ask your MCP client in plain language. Some examples:

> *"Lista los primeros 10 contactos de mi cuenta de Wasapi."*

> *"¿Cuántos contactos tengo en total?"*

> *"Crea un contacto: Ana Gómez, teléfono +57 300 123 4567, código de país 57."*

> *"Envíale por WhatsApp a +57 300 123 4567 el mensaje: 'Hola Ana, te confirmo tu cita mañana a las 10am.'"*

> *"Etiqueta al contacto con UUID `abc-123` con el label 42."*

> *"Muéstrame los últimos mensajes con el wa_id 573001234567."*

Claude figures out which of the 12 tools to use, asks for clarification if anything's ambiguous, and shows you the response.

---

## Compatible clients

Works with **any MCP-compatible client that runs local stdio servers**:

| Client | Supported by wizard | Notes |
|---|---|---|
| **Claude Desktop** | ✅ Auto-configures + auto-restart | Recommended |
| **Cursor** | ✅ Auto-configures + auto-restart | |
| **Claude Code** | Use `--print-only` | Manual config (use `claude mcp add` or edit `~/.claude.json`) |
| **Windsurf, Zed, others** | Use `--print-only` | Paste the JSON in their MCP config |

> **Note:** This is a **local stdio** MCP server. It does **not** work in **Claude.ai web** — that requires a hosted MCP server, which is a different deployment model.

---

## Setup wizard flags

```bash
npx -y @jpabloe/wasapi-mcp-server setup [flags]

  --target claude-desktop|cursor   Skip the platform menu, install directly
  --restart                        Auto-restart the target app after writing (macOS)
  --print-only                     Print the JSON; never write to disk
  --local                          (dev) Write a local node path instead of npx
```

Examples:

```bash
# Auto-configure Claude Desktop and restart it
npx -y @jpabloe/wasapi-mcp-server setup --target claude-desktop --restart

# Get the JSON to paste into Windsurf / Zed / Claude Code manually
npx -y @jpabloe/wasapi-mcp-server setup --print-only
```

---

## Manual install

If you'd rather edit the config yourself:

1. Get your API key at [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer)
2. Paste this into your MCP client's config:

```json
{
  "mcpServers": {
    "wasapi": {
      "command": "npx",
      "args": ["-y", "@jpabloe/wasapi-mcp-server"],
      "env": {
        "WASAPI_API_KEY": "your_api_key_here",
        "WASAPI_FROM_ID": "12345"
      }
    }
  }
}
```

3. Restart your MCP client.

**Common config paths:**

| Client | macOS | Linux | Windows |
|---|---|---|---|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | `~/.config/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` |

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `WASAPI_API_KEY` | yes | Your Wasapi API key. Get it at [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer) |
| `WASAPI_FROM_ID` | no | Default WhatsApp number ID for outgoing messages. Use the `list_whatsapp_numbers` tool to discover yours. |
| `WASAPI_BASE_URL` | no | Override the SDK base URL (staging / testing) |
| `WASAPI_DEBUG` | no | Set to `1` for verbose error logging to stderr |

---

## Tools (12 total)

### Contacts (7)

| Tool | What it does | Key params |
|---|---|---|
| `list_contacts` | Paginated contact list with optional search | `search`, `labels[]`, `page` |
| `get_contact` | Fetch a contact by WhatsApp ID | `wa_id` |
| `create_contact` | Create a contact | `first_name` (req), `phone`, `country_code`, `last_name`, `email` |
| `update_contact` | Update an existing contact | `wa_id` + fields to change |
| `delete_contact` | Permanently delete a contact | `wa_id` |
| `add_label_to_contact` | Attach a label | `contact_uuid`, `label_id` |
| `remove_label_from_contact` | Detach a label | `contact_uuid`, `label_id` |

Contacts are identified by `wa_id` (a string WhatsApp ID), not numeric ID.

### WhatsApp (5)

| Tool | What it does | Key params |
|---|---|---|
| `list_whatsapp_numbers` | List connected numbers + their `from_id` | — |
| `send_message` | Send a plain-text message | `wa_id`, `message`, `from_id` (opt) |
| `send_template` | Send an approved template | `recipients[]`, `template_id` (UUID), `contact_type`, `from_id` (opt) |
| `send_attachment` | Send a file from local path | `wa_id`, `filePath`, `caption` (opt), `from_id` (opt) |
| `get_conversation` | Fetch message thread with a contact | `wa_id`, `from_id` (opt), `page` (opt) |

---

## Troubleshooting

### "I ran the wizard but the MCP doesn't show up in my client"

1. **Full restart, not just close window.** On macOS: `Cmd+Q`, not just clicking the red ×. Or run the wizard with `--restart`.
2. **Check the config path.** The wizard prints the path it wrote to. Confirm that's the same path your client uses (paths table above).
3. **Check for `CLAUDE_DESKTOP_CONFIG` / `CURSOR_MCP_CONFIG` env vars** left over from testing:
   ```bash
   echo $CLAUDE_DESKTOP_CONFIG
   echo $CURSOR_MCP_CONFIG
   ```
   If either prints a path, unset it and re-run the wizard. The wizard now warns about this, but older versions didn't.

### "Tools call returns 'API key inválida o sin permisos'"

Your API key works but doesn't have permission for that endpoint. Check the developer console at [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer) and confirm the key has the scopes you need.

### "send_attachment fails: file not found"

The `filePath` must exist on the **machine running the MCP server** (your computer), not on the MCP client's machine. URL-based attachments aren't supported by the SDK yet. Download the file locally first.

### "list_conversations doesn't exist"

Correct — the underlying SDK doesn't expose it yet. Use `get_conversation` with a known `wa_id` to fetch the message thread with a specific contact.

### Enabling debug logs

```bash
WASAPI_DEBUG=1 wasapi-mcp
```

Or set `WASAPI_DEBUG=1` in the `env` block of your MCP client config. Logs go to stderr.

---

## Limitations

| Gap | Notes |
|---|---|
| `list_conversations` not implemented | SDK doesn't expose it. Use `get_conversation` with a `wa_id`. |
| `send_attachment` requires local `filePath` | No URL-based attachment support yet. |
| `send_template` has no variable interpolation | Template content is whatever the template defines server-side. |

---

## Development

```bash
git clone <this repo>
npm install
npm run dev          # run with tsx (requires WASAPI_API_KEY)
npm test             # unit + contract tests
npm run typecheck
npm run build
```

### Integration tests (opt-in)

```bash
WASAPI_TEST_API_KEY=your_key_here npm run test:integration
```

The integration smoke test calls `list_contacts` against the real Wasapi API. Skipped when `WASAPI_TEST_API_KEY` is not set.

---

## License

ISC
