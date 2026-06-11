// tests/unit/server.test.ts
import { describe, it, expect } from "vitest";
import { buildServer } from "../../src/server.js";

describe("buildServer", () => {
  it("registers all tools without throwing", async () => {
    process.env.WASAPI_API_KEY = "k";
    const server = buildServer([
      {
        name: "ping",
        description: "ping",
        schema: (await import("zod")).z.object({}),
        handler: async () => ({ ok: true }),
      },
    ]);
    expect(server).toBeDefined();
  });
});
