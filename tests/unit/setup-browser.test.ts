import { describe, it, expect } from "vitest";
import { resolveOpenCommand } from "../../src/setup/browser.js";

describe("resolveOpenCommand", () => {
  it("returns 'open' on darwin", () => {
    expect(resolveOpenCommand("darwin")).toEqual({ command: "open", argsPrefix: [] });
  });
  it("returns explorer on win32", () => {
    expect(resolveOpenCommand("win32")).toEqual({ command: "cmd", argsPrefix: ["/c", "start", ""] });
  });
  it("returns xdg-open on linux", () => {
    expect(resolveOpenCommand("linux")).toEqual({ command: "xdg-open", argsPrefix: [] });
  });
  it("returns null on unknown", () => {
    expect(resolveOpenCommand("freebsd" as NodeJS.Platform)).toBeNull();
  });
});
