// tests/unit/tools/reports.test.ts
import { describe, it, expect, vi } from "vitest";
import { getAgentPerformanceReportTool } from "../../../src/tools/reports/agent-performance.js";
import { getWorkflowVolumeReportTool } from "../../../src/tools/reports/workflow-volume.js";
import { getSatisfactionSurveyReportTool } from "../../../src/tools/reports/satisfaction-survey.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getPerformanceByAgent: vi.fn().mockResolvedValue({ data: {} }),
  getVolumeOfWorkflow: vi.fn().mockResolvedValue({ data: {} }),
  getSatisfactionSurvey: vi.fn().mockResolvedValue({ data: {} }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ reports: mocks }),
}));

describe("reports tools", () => {
  it("agent_performance requires dates, includes agent_id when given", async () => {
    const h = wrapHandler(getAgentPerformanceReportTool.schema, getAgentPerformanceReportTool.handler);
    expect((await h({ start_date: "2026-01-01" })).isError).toBe(true);
    await h({ start_date: "2026-01-01", end_date: "2026-01-31", agent_id: 7 });
    expect(mocks.getPerformanceByAgent).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31", agent_id: 7 });
  });

  it("agent_performance omits agent_id when not given", async () => {
    const h = wrapHandler(getAgentPerformanceReportTool.schema, getAgentPerformanceReportTool.handler);
    await h({ start_date: "2026-01-01", end_date: "2026-01-31" });
    expect(mocks.getPerformanceByAgent).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31", agent_id: undefined });
  });

  it("workflow_volume maps from_id filter", async () => {
    const h = wrapHandler(getWorkflowVolumeReportTool.schema, getWorkflowVolumeReportTool.handler);
    await h({ start_date: "2026-01-01", end_date: "2026-01-31", from_id: 5 });
    expect(mocks.getVolumeOfWorkflow).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31", from_id: 5 });
  });

  it("satisfaction_survey requires dates", async () => {
    const h = wrapHandler(getSatisfactionSurveyReportTool.schema, getSatisfactionSurveyReportTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ start_date: "2026-01-01", end_date: "2026-01-31" });
    expect(mocks.getSatisfactionSurvey).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31", agent_id: undefined });
  });
});
