// tests/unit/wasapi.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { __resetClientForTests, getClient } from "../../src/wasapi.js";

describe("getClient", () => {
  beforeEach(() => {
    __resetClientForTests();
    process.env.WASAPI_API_KEY = "k";
  });

  it("returns a singleton", () => {
    const a = getClient();
    const b = getClient();
    expect(a).toBe(b);
  });
});
