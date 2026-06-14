import { describe, it, expect, vi } from "vitest";
import { getAgentTimeResponseTool } from "../../../src/tools/metrics/agent-time-response.js";
import { getAgentTransferredTool } from "../../../src/tools/metrics/agent-transferred.js";
import { getAgentVolumeOfWorkTool } from "../../../src/tools/metrics/agent-volume-of-work.js";
import { getAgentTimeInConversationTool } from "../../../src/tools/metrics/agent-time-in-conversation.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAgentTimeResponse: vi.fn().mockResolvedValue({ data: {} }),
  getAgentTransferred: vi.fn().mockResolvedValue({ data: {} }),
  getAgentVolumeOfWork: vi.fn().mockResolvedValue({ data: {} }),
  getAgentTimeInConversation: vi.fn().mockResolvedValue({ data: {} }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ metrics: mocks }),
}));

describe("metrics — per-agent tools", () => {
  const cases: [string, any, any][] = [
    ["get_agent_time_response", getAgentTimeResponseTool, mocks.getAgentTimeResponse],
    ["get_agent_transferred", getAgentTransferredTool, mocks.getAgentTransferred],
    ["get_agent_volume_of_work", getAgentVolumeOfWorkTool, mocks.getAgentVolumeOfWork],
    ["get_agent_time_in_conversation", getAgentTimeInConversationTool, mocks.getAgentTimeInConversation],
  ];

  for (const [name, tool, mock] of cases) {
    it(`${name} maps agent_id + dates to camelCase`, async () => {
      const h = wrapHandler(tool.schema, tool.handler);
      await h({ agent_id: 42, start_date: "2026-01-01", end_date: "2026-01-31" });
      expect(mock).toHaveBeenCalledWith({ agentId: 42, startDate: "2026-01-01", endDate: "2026-01-31" });
    });

    it(`${name} requires agent_id`, async () => {
      const h = wrapHandler(tool.schema, tool.handler);
      expect((await h({ start_date: "2026-01-01", end_date: "2026-01-31" })).isError).toBe(true);
    });
  }
});
