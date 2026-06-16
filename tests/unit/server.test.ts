// tests/unit/server.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildServer, buildToolList } from "../../src/server.js";
import type { ToolDefinition } from "../../src/lib/register-tool.js";

const tools: ToolDefinition[] = [
  { name: "list_contacts", description: "read tool", schema: z.object({}), handler: async () => ({}) },
  { name: "delete_contact", description: "write tool", schema: z.object({}), handler: async () => ({}) },
];

describe("buildServer", () => {
  it("registers tools without throwing", () => {
    expect(buildServer(tools)).toBeDefined();
  });

  it("buildToolList includes annotations with title + correct hint", () => {
    const list = buildToolList(tools);
    const byName = Object.fromEntries(list.map((t) => [t.name, t]));
    expect(byName.list_contacts.annotations).toEqual({ title: "Listar contactos", readOnlyHint: true });
    expect(byName.delete_contact.annotations).toEqual({
      title: "Eliminar contacto",
      readOnlyHint: false,
      destructiveHint: true,
    });
  });
});
