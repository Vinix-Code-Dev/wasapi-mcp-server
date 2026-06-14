import { describe, it, expect, vi } from "vitest";
import { getOnlineAgentsTool } from "../../../src/tools/metrics/online-agents.js";
import { getStatusContactsTool } from "../../../src/tools/metrics/status-contacts.js";
import { getTotalCampaignsTool } from "../../../src/tools/metrics/total-campaigns.js";
import { getConsolidatedConversationsTool } from "../../../src/tools/metrics/consolidated-conversations.js";
import { getAgentConversationsTool } from "../../../src/tools/metrics/agent-conversations.js";
import { getMessagesTool } from "../../../src/tools/metrics/messages.js";
import { getMessagesBotTool } from "../../../src/tools/metrics/messages-bot.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getOnlineAgents: vi.fn().mockResolvedValue({ data: [] }),
  getStatusContacts: vi.fn().mockResolvedValue({ data: {} }),
  getTotalCampaigns: vi.fn().mockResolvedValue({ data: {} }),
  getConsolidatedConversations: vi.fn().mockResolvedValue({ data: {} }),
  getAgentConversations: vi.fn().mockResolvedValue({ data: [] }),
  getMessages: vi.fn().mockResolvedValue({ data: {} }),
  getMessagesBot: vi.fn().mockResolvedValue({ data: {} }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ metrics: mocks }),
}));

describe("metrics — no-date tools", () => {
  it("get_online_agents takes no args", async () => {
    const h = wrapHandler(getOnlineAgentsTool.schema, getOnlineAgentsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getOnlineAgents).toHaveBeenCalled();
  });
  it("get_status_contacts takes no args", async () => {
    const h = wrapHandler(getStatusContactsTool.schema, getStatusContactsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getStatusContacts).toHaveBeenCalled();
  });
});

describe("metrics — date-range tools", () => {
  const cases: [string, any, any][] = [
    ["get_total_campaigns", getTotalCampaignsTool, mocks.getTotalCampaigns],
    ["get_consolidated_conversations", getConsolidatedConversationsTool, mocks.getConsolidatedConversations],
    ["get_agent_conversations", getAgentConversationsTool, mocks.getAgentConversations],
    ["get_messages", getMessagesTool, mocks.getMessages],
    ["get_messages_bot", getMessagesBotTool, mocks.getMessagesBot],
  ];

  for (const [name, tool, mock] of cases) {
    it(`${name} maps snake_case dates to camelCase`, async () => {
      const h = wrapHandler(tool.schema, tool.handler);
      await h({ start_date: "2026-01-01", end_date: "2026-01-31" });
      expect(mock).toHaveBeenCalledWith({ startDate: "2026-01-01", endDate: "2026-01-31" });
    });

    it(`${name} requires both dates`, async () => {
      const h = wrapHandler(tool.schema, tool.handler);
      expect((await h({ start_date: "2026-01-01" })).isError).toBe(true);
    });
  }
});
