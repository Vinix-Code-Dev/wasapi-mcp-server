import { describe, it, expect, vi, beforeEach } from "vitest";
import { listFlowsTool } from "../../../src/tools/whatsapp/list-flows.js";
import { listFlowsByNumberTool } from "../../../src/tools/whatsapp/list-flows-by-number.js";
import { sendFlowTool } from "../../../src/tools/whatsapp/send-flow.js";
import { getFlowResponsesTool } from "../../../src/tools/whatsapp/get-flow-responses.js";
import { getFlowAssetsTool } from "../../../src/tools/whatsapp/get-flow-assets.js";
import { getFlowScreensTool } from "../../../src/tools/whatsapp/get-flow-screens.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getFlows: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getFlowsByPhoneId: vi.fn().mockResolvedValue({ data: [] }),
  sendFlow: vi.fn().mockResolvedValue({ success: true }),
  getFlowResponses: vi.fn().mockResolvedValue({ data: [] }),
  getFlowAssets: vi.fn().mockResolvedValue({ success: true, data: {} }),
  getFlowScreens: vi.fn().mockResolvedValue({ screens: [] }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: mocks }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WASAPI_API_KEY = "test";
  process.env.WASAPI_FROM_ID = "10";
});

describe("flows tools", () => {
  it("list_flows takes no args", async () => {
    const h = wrapHandler(listFlowsTool.schema, listFlowsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getFlows).toHaveBeenCalled();
  });

  it("list_flows_by_number falls back to WASAPI_FROM_ID", async () => {
    const h = wrapHandler(listFlowsByNumberTool.schema, listFlowsByNumberTool.handler);
    await h({});
    expect(mocks.getFlowsByPhoneId).toHaveBeenCalledWith(10);
  });

  it("send_flow requires wa_id, message, cta, screen, flow_id", async () => {
    const h = wrapHandler(sendFlowTool.schema, sendFlowTool.handler);
    expect((await h({ wa_id: "57300" })).isError).toBe(true);
    const ok = await h({ wa_id: "57300", message: "hola", cta: "Abrir", screen: "WELCOME", flow_id: "f1" });
    expect(ok.isError).toBeFalsy();
    expect(mocks.sendFlow).toHaveBeenCalledWith(
      expect.objectContaining({ wa_id: "57300", flow_id: "f1", phone_id: 10 }),
    );
  });

  it("get_flow_responses requires flow_id, supports paging", async () => {
    const h = wrapHandler(getFlowResponsesTool.schema, getFlowResponsesTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ flow_id: "f1", page: 2, per_page: 25 });
    expect(mocks.getFlowResponses).toHaveBeenCalledWith({ flow_id: "f1", page: 2, per_page: 25 });
  });

  it("get_flow_assets and get_flow_screens take flow_id + optional phone_id", async () => {
    const ha = wrapHandler(getFlowAssetsTool.schema, getFlowAssetsTool.handler);
    await ha({ flow_id: "f1" });
    expect(mocks.getFlowAssets).toHaveBeenCalledWith({ flow_id: "f1", phone_id: 10 });
    const hs = wrapHandler(getFlowScreensTool.schema, getFlowScreensTool.handler);
    await hs({ flow_id: "f1", phone_id: 77 });
    expect(mocks.getFlowScreens).toHaveBeenCalledWith({ flow_id: "f1", phone_id: 77 });
  });
});
