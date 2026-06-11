// tests/unit/tools/contacts-update.test.ts
import { describe, it, expect, vi } from "vitest";
import { updateContactTool } from "../../../src/tools/contacts/update.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const updateMock = vi.fn().mockResolvedValue({ wa_id: "573001234567", first_name: "Ana" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { update: updateMock } }),
}));

describe("update_contact", () => {
  it("updates by wa_id with partial fields, passes { wa_id, data } to SDK", async () => {
    updateMock.mockClear();
    const h = wrapHandler(updateContactTool.schema, updateContactTool.handler);
    const res = await h({ wa_id: "573001234567", first_name: "Ana" });
    expect(res.isError).toBeFalsy();
    expect(updateMock).toHaveBeenCalledWith({
      wa_id: "573001234567",
      data: { first_name: "Ana" },
    });
  });

  it("rejects missing wa_id", async () => {
    const h = wrapHandler(updateContactTool.schema, updateContactTool.handler);
    const res = await h({ first_name: "Ana" });
    expect(res.isError).toBe(true);
  });

  it("passes all optional fields in data", async () => {
    updateMock.mockClear();
    const h = wrapHandler(updateContactTool.schema, updateContactTool.handler);
    await h({ wa_id: "573001234567", first_name: "Ana", last_name: "Garcia", email: "ana@x.com" });
    expect(updateMock).toHaveBeenCalledWith({
      wa_id: "573001234567",
      data: { first_name: "Ana", last_name: "Garcia", email: "ana@x.com" },
    });
  });
});
