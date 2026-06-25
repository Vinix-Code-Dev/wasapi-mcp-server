import { describe, it, expect } from "vitest";
import { dispatch } from "../../src/index.js";

describe("dispatch", () => {
  it("returns 'server' for no args", () => {
    expect(dispatch([])).toEqual({ kind: "server" });
  });
  it("returns 'setup' for setup", () => {
    expect(dispatch(["setup"])).toEqual({ kind: "setup", printOnly: false, local: false, restart: false });
  });
  it("returns 'setup' with printOnly=true for setup --print-only", () => {
    expect(dispatch(["setup", "--print-only"])).toEqual({ kind: "setup", printOnly: true, local: false, restart: false });
  });
  it("returns 'setup' with local=true for setup --local", () => {
    expect(dispatch(["setup", "--local"])).toEqual({ kind: "setup", printOnly: false, local: true, restart: false });
  });
  it("returns 'setup' with restart=true for setup --restart", () => {
    expect(dispatch(["setup", "--restart"])).toEqual({ kind: "setup", printOnly: false, local: false, restart: true });
  });
  it("returns 'serve' for serve (no port)", () => {
    const prev = process.env.PORT;
    delete process.env.PORT;
    expect(dispatch(["serve"])).toEqual({ kind: "serve", port: undefined });
    if (prev !== undefined) process.env.PORT = prev;
  });
  it("returns 'serve' with a port for serve --port 8080", () => {
    expect(dispatch(["serve", "--port", "8080"])).toEqual({ kind: "serve", port: 8080 });
  });
  it("returns 'serve' with a port for serve --port=8080", () => {
    expect(dispatch(["serve", "--port=8080"])).toEqual({ kind: "serve", port: 8080 });
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
