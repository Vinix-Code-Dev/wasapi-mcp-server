import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
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
    expect(() => readConfig(cfgPath)).toThrow(/parse/i);
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

  it("does not overwrite when overwrite=false and entry exists", () => {
    writeFileSync(cfgPath, JSON.stringify({ mcpServers: { wasapi: { command: "old" } } }));
    const result = writeWasapiEntry({ path: cfgPath, entry, overwrite: false });
    expect(result.backupPath).toBeNull();
    const after = JSON.parse(readFileSync(cfgPath, "utf8"));
    expect(after.mcpServers.wasapi).toEqual({ command: "old" });
  });
});
