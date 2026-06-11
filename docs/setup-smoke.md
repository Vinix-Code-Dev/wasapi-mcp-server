# Setup Wizard — Manual Smoke Checklist

Run before each release. Each step should produce the expected outcome with no manual fixups.

## Prep
- Have a valid Wasapi API key handy (use a sandbox/staging account when possible).
- Use a scratch path so you don't touch the real config:
  ```bash
  export CLAUDE_DESKTOP_CONFIG=/tmp/smoke-config.json
  ```

## Cases

### 1. Fresh install
- `rm -f /tmp/smoke-config.json`
- `node dist/index.js setup`
- Paste your API key.
- Expect: wizard runs end-to-end, file created at `/tmp/smoke-config.json` with `mcpServers.wasapi` entry.

### 2. Coexistence with other MCPs
- Pre-populate: `echo '{"mcpServers":{"other":{"command":"x"}}}' > /tmp/smoke-config.json`
- `node dist/index.js setup` and accept auto-config.
- Expect: `other` still present, `wasapi` added alongside.

### 3. Existing wasapi entry — overwrite
- With config from case 2, re-run `node dist/index.js setup`.
- Expect: wizard runs, backup file created, entry replaced.

### 4. Non-TTY rejection
- `echo '' | node dist/index.js setup`
- Expect: immediate exit 1 with message "setup requiere terminal interactiva".

### 5. --print-only
- `node dist/index.js setup --print-only`
- Paste API key.
- Expect: JSON printed to stdout, `/tmp/smoke-config.json` untouched.

### 6. Browser fallback
- Force the open command to fail (e.g. temporarily rename `/usr/bin/open` on macOS, or use a system where no opener exists).
- Expect: wizard continues, prints URL for manual visit.
