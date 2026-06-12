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
