import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCampaignTool } from "../../../src/tools/campaigns/create.js";
import { getCampaignStatsTool } from "../../../src/tools/campaigns/stats.js";
import { getCampaignLogsTool } from "../../../src/tools/campaigns/logs.js";
import { cancelCampaignTool } from "../../../src/tools/campaigns/cancel.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const post = vi.fn();
const get = vi.fn();

vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ getClient: () => ({ get, post }) }),
}));

const validCampaign = {
  name: "Test API",
  template_uuid: "d9ff9efb-ab2c-4de7-a3fb-450c03977e72",
  phone_id: 1,
  recipients: { type: "phones", values: ["573122116233"] },
  variables: { body: ["juanes"] },
};

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  post.mockResolvedValue({ data: { success: true, data: { uuid: "new" }, recipients: { matched: 1, skipped: [] } } });
  get.mockResolvedValue({ data: { success: true, data: [] } });
});

describe("create_campaign", () => {
  const h = wrapHandler(createCampaignTool.schema, createCampaignTool.handler);

  it("with confirm=false returns a preview and does NOT call the API", async () => {
    const res = await h({ ...validCampaign, confirm: false });
    expect(res.isError).toBeFalsy();
    expect(post).not.toHaveBeenCalled();
    const body = JSON.parse(res.content[0].text);
    expect(body.preview).toBe(true);
    expect(body.recipients_summary.count).toBe(1);
  });

  it("with confirm=true POSTs to /campaigns without the confirm flag", async () => {
    const res = await h({ ...validCampaign, confirm: true });
    expect(res.isError).toBeFalsy();
    expect(post).toHaveBeenCalledTimes(1);
    const [url, payload] = post.mock.calls[0];
    expect(url).toBe("/campaigns");
    expect(payload).not.toHaveProperty("confirm");
    expect(payload.name).toBe("Test API");
    expect(payload.recipients.values).toEqual(["573122116233"]);
  });

  it("rejects when values is missing and type != all", async () => {
    const res = await h({ ...validCampaign, recipients: { type: "labels" }, confirm: true });
    expect(res.isError).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it("allows type=all without values", async () => {
    const res = await h({ name: "All", template_uuid: validCampaign.template_uuid, phone_id: 1, recipients: { type: "all" }, confirm: true });
    expect(res.isError).toBeFalsy();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid scheduled_at format", async () => {
    const res = await h({ ...validCampaign, scheduled_at: "2026/12/01 9am", confirm: true });
    expect(res.isError).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it("requires the confirm field", async () => {
    const res = await h({ ...validCampaign });
    expect(res.isError).toBe(true);
  });
});

describe("get_campaign_stats", () => {
  it("GETs /campaigns/{uuid}/stats", async () => {
    const h = wrapHandler(getCampaignStatsTool.schema, getCampaignStatsTool.handler);
    const res = await h({ campaign_uuid: "abc" });
    expect(res.isError).toBeFalsy();
    expect(get).toHaveBeenCalledWith("/campaigns/abc/stats");
  });
});

describe("get_campaign_logs", () => {
  it("GETs /campaigns/{uuid}/logs passing cursor and per_page", async () => {
    const h = wrapHandler(getCampaignLogsTool.schema, getCampaignLogsTool.handler);
    const res = await h({ campaign_uuid: "abc", cursor: "cur1", per_page: 25 });
    expect(res.isError).toBeFalsy();
    expect(get).toHaveBeenCalledWith("/campaigns/abc/logs", { params: { cursor: "cur1", per_page: 25 } });
  });

  it("works with only the uuid", async () => {
    const h = wrapHandler(getCampaignLogsTool.schema, getCampaignLogsTool.handler);
    const res = await h({ campaign_uuid: "abc" });
    expect(res.isError).toBeFalsy();
    expect(get).toHaveBeenCalledWith("/campaigns/abc/logs", { params: {} });
  });
});

describe("cancel_campaign", () => {
  it("POSTs /campaigns/{uuid}/cancel", async () => {
    const h = wrapHandler(cancelCampaignTool.schema, cancelCampaignTool.handler);
    const res = await h({ campaign_uuid: "abc" });
    expect(res.isError).toBeFalsy();
    expect(post).toHaveBeenCalledWith("/campaigns/abc/cancel", {});
  });
});
