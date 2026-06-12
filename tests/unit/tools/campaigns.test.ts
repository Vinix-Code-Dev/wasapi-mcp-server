import { describe, it, expect, vi } from "vitest";
import { listCampaignsTool } from "../../../src/tools/campaigns/list.js";
import { getCampaignTool } from "../../../src/tools/campaigns/get.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ success: true, data: [{ uuid: "c1", name: "Promo" }], count: 1 }),
  getById: vi.fn().mockResolvedValue({ success: true, data: { campaign: { uuid: "c1" }, jobs: { data: [] } } }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ campaigns: mocks }),
}));

describe("campaigns tools", () => {
  it("list_campaigns takes no args and returns campaigns", async () => {
    const h = wrapHandler(listCampaignsTool.schema, listCampaignsTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalled();
    expect(JSON.parse(res.content[0].text).count).toBe(1);
  });

  it("get_campaign requires campaign_uuid", async () => {
    const h = wrapHandler(getCampaignTool.schema, getCampaignTool.handler);
    expect((await h({})).isError).toBe(true);
    const ok = await h({ campaign_uuid: "c1" });
    expect(ok.isError).toBeFalsy();
    expect(mocks.getById).toHaveBeenCalledWith("c1");
  });
});
