// tests/unit/tools/custom-fields.test.ts
import { describe, it, expect, vi } from "vitest";
import { listCustomFieldsTool } from "../../../src/tools/custom-fields/list.js";
import { getCustomFieldTool } from "../../../src/tools/custom-fields/get.js";
import { createCustomFieldTool } from "../../../src/tools/custom-fields/create.js";
import { updateCustomFieldTool } from "../../../src/tools/custom-fields/update.js";
import { deleteCustomFieldTool } from "../../../src/tools/custom-fields/delete.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getById: vi.fn().mockResolvedValue({ success: true, data: { id: "f1" } }),
  create: vi.fn().mockResolvedValue({ success: true, data: { id: "f2" } }),
  update: vi.fn().mockResolvedValue({ success: true, data: { id: "f1" } }),
  delete: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ customFields: mocks }),
}));

describe("custom fields tools", () => {
  it("list_custom_fields takes no args", async () => {
    const h = wrapHandler(listCustomFieldsTool.schema, listCustomFieldsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalled();
  });

  it("get_custom_field passes field_id positionally", async () => {
    const h = wrapHandler(getCustomFieldTool.schema, getCustomFieldTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ field_id: "f1" });
    expect(mocks.getById).toHaveBeenCalledWith("f1");
  });

  it("create_custom_field maps name", async () => {
    const h = wrapHandler(createCustomFieldTool.schema, createCustomFieldTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ name: "Cédula" });
    expect(mocks.create).toHaveBeenCalledWith({ name: "Cédula" });
  });

  it("update_custom_field maps to { id, data: { name } }", async () => {
    const h = wrapHandler(updateCustomFieldTool.schema, updateCustomFieldTool.handler);
    expect((await h({ field_id: "f1" })).isError).toBe(true);
    await h({ field_id: "f1", name: "NIT" });
    expect(mocks.update).toHaveBeenCalledWith({ id: "f1", data: { name: "NIT" } });
  });

  it("delete_custom_field passes field_id positionally", async () => {
    const h = wrapHandler(deleteCustomFieldTool.schema, deleteCustomFieldTool.handler);
    await h({ field_id: "f1" });
    expect(mocks.delete).toHaveBeenCalledWith("f1");
  });
});
