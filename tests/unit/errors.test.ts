// tests/unit/errors.test.ts
import { describe, it, expect } from "vitest";
import { mapError } from "../../src/lib/errors.js";

const axiosErr = (status: number, data?: unknown, headers?: Record<string, string>) => ({
  isAxiosError: true,
  response: { status, data, headers: headers ?? {} },
  message: "Request failed",
});

describe("mapError", () => {
  it("maps 401 to auth", () => {
    expect(mapError(axiosErr(401)).category).toBe("auth");
  });
  it("maps 403 to auth", () => {
    expect(mapError(axiosErr(403)).category).toBe("auth");
  });
  it("maps 404 to not_found with detail", () => {
    const r = mapError(axiosErr(404, { message: "contact x" }));
    expect(r.category).toBe("not_found");
    expect(r.message).toContain("contact x");
  });
  it("maps 422 to validation", () => {
    expect(mapError(axiosErr(422, { errors: { phone: "required" } })).category).toBe("validation");
  });
  it("maps 429 to rate_limit and includes retry-after", () => {
    const r = mapError(axiosErr(429, undefined, { "retry-after": "30" }));
    expect(r.category).toBe("rate_limit");
    expect(r.message).toContain("30");
  });
  it("maps 500 to server", () => {
    expect(mapError(axiosErr(500)).category).toBe("server");
  });
  it("maps network errors to network", () => {
    expect(mapError({ isAxiosError: true, code: "ECONNREFUSED", message: "x" }).category).toBe("network");
  });
  it("maps unknown to unknown", () => {
    expect(mapError(new Error("oops")).category).toBe("unknown");
  });
});
