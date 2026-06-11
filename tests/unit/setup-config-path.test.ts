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
    expect(() => resolveConfigPath({ platform: "freebsd" as NodeJS.Platform, env: {} })).toThrow(/Unsupported platform/);
  });
});
