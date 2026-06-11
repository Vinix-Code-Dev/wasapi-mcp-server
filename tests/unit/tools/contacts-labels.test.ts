// tests/unit/tools/contacts-labels.test.ts
import { describe, it, expect, vi } from "vitest";
import { addLabelTool } from "../../../src/tools/contacts/add-label.js";
import { removeLabelTool } from "../../../src/tools/contacts/remove-label.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const addMock = vi.fn().mockResolvedValue({ ok: true });
const removeMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({
    contacts: { addLabel: addMock, removeLabel: removeMock },
  }),
}));

describe("contact labels", () => {
  it("adds label — passes { contact_uuid, label_id: [id] } to SDK", async () => {
    addMock.mockClear();
    const h = wrapHandler(addLabelTool.schema, addLabelTool.handler);
    const res = await h({ contact_uuid: "uuid-abc-123", label_id: 9 });
    expect(res.isError).toBeFalsy();
    expect(addMock).toHaveBeenCalledWith({ contact_uuid: "uuid-abc-123", label_id: [9] });
  });

  it("rejects missing contact_uuid for add", async () => {
    const h = wrapHandler(addLabelTool.schema, addLabelTool.handler);
    const res = await h({ label_id: 9 });
    expect(res.isError).toBe(true);
  });

  it("removes label — passes { contact_uuid, label_id: [id] } to SDK", async () => {
    removeMock.mockClear();
    const h = wrapHandler(removeLabelTool.schema, removeLabelTool.handler);
    const res = await h({ contact_uuid: "uuid-abc-123", label_id: 9 });
    expect(res.isError).toBeFalsy();
    expect(removeMock).toHaveBeenCalledWith({ contact_uuid: "uuid-abc-123", label_id: [9] });
  });

  it("rejects missing label_id for remove", async () => {
    const h = wrapHandler(removeLabelTool.schema, removeLabelTool.handler);
    const res = await h({ contact_uuid: "uuid-abc-123" });
    expect(res.isError).toBe(true);
  });
});
