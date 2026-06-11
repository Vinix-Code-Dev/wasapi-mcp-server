// tests/unit/tools/contacts-list.test.ts
import { describe, it, expect, vi } from "vitest";
import { listContactsTool } from "../../../src/tools/contacts/list.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const getSearchMock = vi.fn().mockResolvedValue({ data: [{ wa_id: "1" }], page: 1 });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({
    contacts: { getSearch: getSearchMock },
  }),
}));

describe("list_contacts", () => {
  it("calls getSearch with no args when called empty", async () => {
    const handler = wrapHandler(listContactsTool.schema, listContactsTool.handler);
    const res = await handler({});
    expect(res.isError).toBeFalsy();
    const body = JSON.parse(res.content[0].text);
    expect(body.data[0].wa_id).toBe("1");
    expect(getSearchMock).toHaveBeenCalledWith({});
  });

  it("passes search and page to getSearch", async () => {
    getSearchMock.mockClear();
    const handler = wrapHandler(listContactsTool.schema, listContactsTool.handler);
    const res = await handler({ search: "Ana", page: 2 });
    expect(res.isError).toBeFalsy();
    expect(getSearchMock).toHaveBeenCalledWith({ search: "Ana", page: 2 });
  });

  it("passes labels to getSearch", async () => {
    getSearchMock.mockClear();
    const handler = wrapHandler(listContactsTool.schema, listContactsTool.handler);
    await handler({ labels: [1, 2] });
    expect(getSearchMock).toHaveBeenCalledWith({ labels: [1, 2] });
  });
});
