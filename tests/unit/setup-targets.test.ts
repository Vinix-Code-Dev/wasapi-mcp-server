import { describe, it, expect } from "vitest";
import { CLAUDE_DESKTOP, CURSOR, ALL_TARGETS, findTargetById } from "../../src/setup/targets.js";

describe("CLAUDE_DESKTOP target", () => {
  it("resolves macOS path", () => {
    expect(CLAUDE_DESKTOP.configPath({ platform: "darwin", env: { HOME: "/Users/x" } })).toBe(
      "/Users/x/Library/Application Support/Claude/claude_desktop_config.json",
    );
  });

  it("resolves Windows path", () => {
    expect(
      CLAUDE_DESKTOP.configPath({ platform: "win32", env: { APPDATA: "C:\\Users\\x\\AppData\\Roaming" } }),
    ).toBe("C:\\Users\\x\\AppData\\Roaming\\Claude\\claude_desktop_config.json");
  });

  it("respects CLAUDE_DESKTOP_CONFIG override", () => {
    expect(
      CLAUDE_DESKTOP.configPath({ platform: "darwin", env: { HOME: "/x", CLAUDE_DESKTOP_CONFIG: "/custom" } }),
    ).toBe("/custom");
  });
});

describe("CURSOR target", () => {
  it("resolves macOS path", () => {
    expect(CURSOR.configPath({ platform: "darwin", env: { HOME: "/Users/x" } })).toBe("/Users/x/.cursor/mcp.json");
  });

  it("resolves Linux path", () => {
    expect(CURSOR.configPath({ platform: "linux", env: { HOME: "/home/x" } })).toBe("/home/x/.cursor/mcp.json");
  });

  it("resolves Windows path", () => {
    expect(CURSOR.configPath({ platform: "win32", env: { USERPROFILE: "C:\\Users\\x" } })).toBe(
      "C:\\Users\\x\\.cursor\\mcp.json",
    );
  });

  it("respects CURSOR_MCP_CONFIG override", () => {
    expect(CURSOR.configPath({ platform: "darwin", env: { HOME: "/x", CURSOR_MCP_CONFIG: "/custom" } })).toBe(
      "/custom",
    );
  });
});

describe("findTargetById", () => {
  it("finds claude-desktop", () => {
    expect(findTargetById("claude-desktop")).toBe(CLAUDE_DESKTOP);
  });
  it("finds cursor", () => {
    expect(findTargetById("cursor")).toBe(CURSOR);
  });
  it("returns undefined for unknown", () => {
    expect(findTargetById("nope")).toBeUndefined();
  });
  it("ALL_TARGETS contains both", () => {
    expect(ALL_TARGETS).toHaveLength(2);
  });
});
