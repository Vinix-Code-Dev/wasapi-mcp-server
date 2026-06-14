// tests/unit/tools/bot.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toggleBotStatusTool } from "../../../src/tools/bot/toggle-status.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue({ success: true });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ bot: { toggleStatus: mock } }),
}));

describe("toggle_bot_status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WASAPI_API_KEY = "test";
    process.env.WASAPI_FROM_ID = "10";
  });

  afterEach(() => {
    delete process.env.WASAPI_API_KEY;
    delete process.env.WASAPI_FROM_ID;
  });

  it("maps to { wa_id, data: { from_id, action } } with from_id fallback", async () => {
    const h = wrapHandler(toggleBotStatusTool.schema, toggleBotStatusTool.handler);
    const res = await h({ wa_id: "573001112233", action: "disable" });
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalledWith({ wa_id: "573001112233", data: { from_id: 10, action: "disable" } });
  });

  it("uses explicit from_id when provided", async () => {
    const h = wrapHandler(toggleBotStatusTool.schema, toggleBotStatusTool.handler);
    await h({ wa_id: "573001112233", action: "enable", from_id: 99 });
    expect(mock).toHaveBeenCalledWith({ wa_id: "573001112233", data: { from_id: 99, action: "enable" } });
  });

  it("rejects invalid action", async () => {
    const h = wrapHandler(toggleBotStatusTool.schema, toggleBotStatusTool.handler);
    expect((await h({ wa_id: "573001112233", action: "pause" })).isError).toBe(true);
  });

  it("rejects missing wa_id", async () => {
    const h = wrapHandler(toggleBotStatusTool.schema, toggleBotStatusTool.handler);
    expect((await h({ action: "enable" })).isError).toBe(true);
  });
});
