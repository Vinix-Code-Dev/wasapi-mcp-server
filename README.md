# @wasapi/mcp-server

MCP server for [Wasapi](https://wasapi.io). Exposes 12 tools for managing contacts and sending WhatsApp messages via the Wasapi platform.

Works with any MCP-compatible client that can run local stdio servers: **Claude Desktop**, **Cursor**, **Claude Code**, **Windsurf**, **Zed**, and others. *(Does not work in Claude.ai web — that requires a hosted MCP server, which is a different deployment model.)*

## Install (recommended)

Run the interactive setup wizard:

```bash
npx -y @wasapi/mcp-server setup
```

It walks you through the flow: opens your Wasapi dashboard, validates your API key against the live API, picks a default WhatsApp number if you have one, and lets you choose where to install the MCP — **Claude Desktop**, **Cursor**, or any other platform (in which case it prints the JSON for you to paste manually).

To skip the platform menu:

```bash
npx -y @wasapi/mcp-server setup --target claude-desktop
npx -y @wasapi/mcp-server setup --target cursor
npx -y @wasapi/mcp-server setup --print-only          # always print, never write
```

## Install (manual)

If you prefer not to use the wizard:

1. Get your API key at [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer)
2. Add this to your MCP client's config (paths below):

```json
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
```

3. Restart your MCP client.

**Common config paths:**

| Platform | macOS / Linux | Windows |
|---|---|---|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) / `~/.config/Claude/claude_desktop_config.json` (Linux) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` |
| Other clients | see their docs | see their docs |

You can also run `npx -y @wasapi/mcp-server setup --print-only` to get the JSON tailored to your account without touching any files.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `WASAPI_API_KEY` | yes | Your Wasapi API key |
| `WASAPI_FROM_ID` | no | Default WhatsApp number ID for outgoing messages. Use `list_whatsapp_numbers` to find yours. |
| `WASAPI_BASE_URL` | no | Override SDK base URL (staging / testing) |
| `WASAPI_DEBUG` | no | Set to `1` for verbose error logging to stderr |

## Tools

### Contacts (7 tools)

| Tool | Description | Key parameters |
|---|---|---|
| `list_contacts` | Paginated contact list with optional search | `search`, `labels[]`, `page` |
| `get_contact` | Fetch a contact by WhatsApp ID | `wa_id` (string) |
| `create_contact` | Create a new contact | `first_name` (required), `phone`, `country_code`, `last_name`, `email` |
| `update_contact` | Update an existing contact | `wa_id` (string), then fields to change |
| `delete_contact` | Permanently delete a contact | `wa_id` (string) |
| `add_label_to_contact` | Attach one or more labels to a contact | `contact_uuid`, `label_id[]` |
| `remove_label_from_contact` | Detach labels from a contact | `contact_uuid`, `label_id[]` |

Note: contacts are identified by `wa_id` (a string WhatsApp ID), not a numeric ID.

### WhatsApp (5 tools)

| Tool | Description | Key parameters |
|---|---|---|
| `list_whatsapp_numbers` | List connected WhatsApp numbers and their `from_id` values | — |
| `send_message` | Send a plain-text WhatsApp message | `wa_id`, `message`, `from_id` (optional) |
| `send_template` | Send an approved WhatsApp template | `recipients[]`, `template_id` (UUID), `contact_type`, `from_id` (optional) |
| `send_attachment` | Send a file attachment | `wa_id`, `filePath`, `caption` (optional), `from_id` (optional) |
| `get_conversation` | Fetch message thread with a contact | `wa_id`, `from_id` (optional), `page` (optional) |

## send_attachment — local file required

`send_attachment` uses `filePath`, which must be a path accessible on the **host running the MCP server**. The SDK does not support URL-based attachments. If the file lives elsewhere, download it first before passing the path to this tool.

## send_template — template_id, not template_name

`send_template` takes a `template_id` UUID (visible in the Wasapi console). Template variable interpolation is not exposed by the SDK — the template content is fixed.

## Known limitations

| Gap | Notes |
|---|---|
| `list_conversations` not implemented | The `@wasapi/js-sdk` has no `listConversations` method. Use `get_conversation` with a known `wa_id` instead. |
| `send_attachment` requires local `filePath` | No URL-based attachment support in the SDK. Requires local filesystem access on the MCP server host. |
| `send_template` has no variable interpolation | Template variables cannot be set at send time via the SDK. |

## Development

```bash
npm install
npm run dev          # run with tsx (requires WASAPI_API_KEY)
npm test             # unit + contract tests
npm run test:integration  # opt-in, needs WASAPI_TEST_API_KEY=xxx
npm run typecheck
npm run build
```

## Running integration tests

```bash
WASAPI_TEST_API_KEY=your_key_here npm run test:integration
```

The integration smoke test calls `list_contacts` against the real Wasapi API. It is skipped when `WASAPI_TEST_API_KEY` is not set.

## License

ISC
