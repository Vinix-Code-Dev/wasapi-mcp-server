// tests/unit/tools/contacts-get.test.ts
import { describe, it, expect, vi } from "vitest";
import { getContactTool } from "../../../src/tools/contacts/get.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const getByIdMock = vi.fn().mockResolvedValue({ wa_id: "5571999", phone: "+5571999" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { getById: getByIdMock } }),
}));

describe("get_contact", () => {
  it("returns contact by wa_id string", async () => {
    const h = wrapHandler(getContactTool.schema, getContactTool.handler);
    const res = await h({ wa_id: "5571999" });
    expect(res.isError).toBeFalsy();
    const body = JSON.parse(res.content[0].text);
    expect(body.wa_id).toBe("5571999");
    expect(getByIdMock).toHaveBeenCalledWith("5571999");
  });

  it("rejects missing wa_id", async () => {
    const h = wrapHandler(getContactTool.schema, getContactTool.handler);
    const res = await h({});
    expect(res.isError).toBe(true);
  });
});
