// tests/unit/tools/contacts-delete.test.ts
import { describe, it, expect, vi } from "vitest";
import { deleteContactTool } from "../../../src/tools/contacts/delete.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const delMock = vi.fn().mockResolvedValue({ deleted: true });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { delete: delMock } }),
}));

describe("delete_contact", () => {
  it("deletes by wa_id string", async () => {
    delMock.mockClear();
    const h = wrapHandler(deleteContactTool.schema, deleteContactTool.handler);
    const res = await h({ wa_id: "573001234567" });
    expect(res.isError).toBeFalsy();
    expect(delMock).toHaveBeenCalledWith("573001234567");
  });

  it("rejects missing wa_id", async () => {
    const h = wrapHandler(deleteContactTool.schema, deleteContactTool.handler);
    const res = await h({});
    expect(res.isError).toBe(true);
  });
});
