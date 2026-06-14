import { describe, it, expect, vi } from "vitest";
import { listFunnelsTool } from "../../../src/tools/funnels/list.js";
import { searchContactInFunnelsTool } from "../../../src/tools/funnels/search-contact.js";
import { moveContactToFunnelStageTool } from "../../../src/tools/funnels/move-contact.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  searchContact: vi.fn().mockResolvedValue({ success: true, data: {} }),
  moveContactToFunnel: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ funnels: mocks }),
}));

describe("funnels tools", () => {
  it("list_funnels takes no args", async () => {
    const h = wrapHandler(listFunnelsTool.schema, listFunnelsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalled();
  });

  it("search_contact_in_funnels maps snake_case to camelCase", async () => {
    const h = wrapHandler(searchContactInFunnelsTool.schema, searchContactInFunnelsTool.handler);
    await h({ phone_number: "573001112233" });
    expect(mocks.searchContact).toHaveBeenCalledWith({ phoneNumber: "573001112233", contactUuid: undefined });
  });

  it("search_contact_in_funnels rejects when neither phone nor uuid given", async () => {
    const h = wrapHandler(searchContactInFunnelsTool.schema, searchContactInFunnelsTool.handler);
    expect((await h({})).isError).toBe(true);
  });

  it("move_contact_to_funnel_stage requires both ids and maps them", async () => {
    const h = wrapHandler(moveContactToFunnelStageTool.schema, moveContactToFunnelStageTool.handler);
    expect((await h({ funnel_contact_id: 1 })).isError).toBe(true);
    await h({ funnel_contact_id: 12, to_stage_id: 5 });
    expect(mocks.moveContactToFunnel).toHaveBeenCalledWith({ funnelContactId: 12, toStageId: 5 });
  });
});
