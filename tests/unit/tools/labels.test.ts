// tests/unit/tools/labels.test.ts
import { describe, it, expect, vi } from "vitest";
import { listLabelsTool } from "../../../src/tools/labels/list.js";
import { searchLabelsTool } from "../../../src/tools/labels/search.js";
import { getLabelTool } from "../../../src/tools/labels/get.js";
import { createLabelTool } from "../../../src/tools/labels/create.js";
import { updateLabelTool } from "../../../src/tools/labels/update.js";
import { deleteLabelTool } from "../../../src/tools/labels/delete.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getSearch: vi.fn().mockResolvedValue({ success: true, data: {} }),
  getById: vi.fn().mockResolvedValue({ success: true, data: { id: "l1" } }),
  create: vi.fn().mockResolvedValue({ success: true, data: { id: "l2" } }),
  update: vi.fn().mockResolvedValue({ success: true, data: { id: "l1" } }),
  delete: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ labels: mocks }),
}));

describe("labels tools", () => {
  it("list_labels takes no args", async () => {
    const h = wrapHandler(listLabelsTool.schema, listLabelsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalled();
  });

  it("search_labels passes name positionally", async () => {
    const h = wrapHandler(searchLabelsTool.schema, searchLabelsTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ name: "VIP" });
    expect(mocks.getSearch).toHaveBeenCalledWith("VIP");
  });

  it("get_label passes label_id positionally", async () => {
    const h = wrapHandler(getLabelTool.schema, getLabelTool.handler);
    await h({ label_id: "l1" });
    expect(mocks.getById).toHaveBeenCalledWith("l1");
  });

  it("create_label maps title/color/description", async () => {
    const h = wrapHandler(createLabelTool.schema, createLabelTool.handler);
    expect((await h({ title: "X" })).isError).toBe(true); // color required
    await h({ title: "VIP", color: "#ff0000", description: "Clientes top" });
    expect(mocks.create).toHaveBeenCalledWith({ title: "VIP", color: "#ff0000", description: "Clientes top" });
  });

  it("update_label maps to { id, data }", async () => {
    const h = wrapHandler(updateLabelTool.schema, updateLabelTool.handler);
    await h({ label_id: "l1", title: "VIP", color: "#00ff00" });
    expect(mocks.update).toHaveBeenCalledWith({ id: "l1", data: { title: "VIP", color: "#00ff00", description: undefined } });
  });

  it("delete_label passes label_id positionally", async () => {
    const h = wrapHandler(deleteLabelTool.schema, deleteLabelTool.handler);
    await h({ label_id: "l1" });
    expect(mocks.delete).toHaveBeenCalledWith("l1");
  });
});
