// tests/unit/register-tool.test.ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { wrapHandler } from "../../src/lib/register-tool.js";

describe("wrapHandler", () => {
  const schema = z.object({ name: z.string() });

  it("returns success content on resolved handler", async () => {
    const handler = wrapHandler(schema, async (args) => ({ greeting: `hi ${args.name}` }));
    const res = await handler({ name: "world" });
    expect(res.isError).toBeFalsy();
    expect(res.content[0].type).toBe("text");
    expect(JSON.parse(res.content[0].text)).toEqual({ greeting: "hi world" });
  });

  it("returns validation error for bad args", async () => {
    const handler = wrapHandler(schema, async () => ({}));
    const res = await handler({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/name/i);
  });

  it("maps thrown SDK errors", async () => {
    const handler = wrapHandler(schema, async () => {
      throw { isAxiosError: true, response: { status: 401 } };
    });
    const res = await handler({ name: "x" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/API key/);
  });
});
