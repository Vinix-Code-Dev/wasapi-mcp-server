import { describe, it, expect } from "vitest";
import { dispatch } from "../../src/index.js";

describe("dispatch", () => {
  it("returns 'server' for no args", () => {
    expect(dispatch([])).toEqual({ kind: "server" });
  });
  it("returns 'setup' for setup", () => {
    expect(dispatch(["setup"])).toEqual({ kind: "setup", printOnly: false });
  });
  it("returns 'setup' with printOnly=true for setup --print-only", () => {
    expect(dispatch(["setup", "--print-only"])).toEqual({ kind: "setup", printOnly: true });
  });
  it("returns 'version' for --version", () => {
    expect(dispatch(["--version"])).toEqual({ kind: "version" });
  });
  it("returns 'help' for --help", () => {
    expect(dispatch(["--help"])).toEqual({ kind: "help" });
  });
  it("returns 'unknown' for anything else", () => {
    expect(dispatch(["foo"])).toEqual({ kind: "unknown", arg: "foo" });
  });
});
