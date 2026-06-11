// tests/unit/tools/contacts-create.test.ts
import { describe, it, expect, vi } from "vitest";
import { createContactTool } from "../../../src/tools/contacts/create.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const createMock = vi.fn().mockResolvedValue({ wa_id: "573001234567", first_name: "Ana" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { create: createMock } }),
}));

describe("create_contact", () => {
  it("creates contact with required first_name and phone", async () => {
    createMock.mockClear();
    const h = wrapHandler(createContactTool.schema, createContactTool.handler);
    const res = await h({ first_name: "Ana", phone: "3001234567", country_code: "57" });
    expect(res.isError).toBeFalsy();
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      first_name: "Ana",
      phone: "3001234567",
      country_code: "57",
    }));
  });

  it("rejects missing first_name", async () => {
    const h = wrapHandler(createContactTool.schema, createContactTool.handler);
    const res = await h({ phone: "3001234567", country_code: "57" });
    expect(res.isError).toBe(true);
  });

  it("accepts optional fields", async () => {
    createMock.mockClear();
    const h = wrapHandler(createContactTool.schema, createContactTool.handler);
    const res = await h({ first_name: "Ana", last_name: "Garcia", email: "ana@example.com", phone: "3001234567", country_code: "57" });
    expect(res.isError).toBeFalsy();
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ last_name: "Garcia", email: "ana@example.com" }));
  });
});
