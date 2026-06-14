// tests/unit/tools/workflow.test.ts
import { describe, it, expect, vi } from "vitest";
import { getWorkflowStatusesTool } from "../../../src/tools/workflow/get-statuses.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue({ data: [] });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ workflow: { getStatuses: mock } }),
}));

describe("get_workflow_statuses", () => {
  it("passes filters through unchanged (snake_case)", async () => {
    const h = wrapHandler(getWorkflowStatusesTool.schema, getWorkflowStatusesTool.handler);
    await h({ action: "open", phone: "573001112233", agent_id: 5, per_page: 25, page: 2 });
    expect(mock).toHaveBeenCalledWith({ action: "open", phone: "573001112233", agent_id: 5, per_page: 25, page: 2 });
  });

  it("works with no args (all optional)", async () => {
    const h = wrapHandler(getWorkflowStatusesTool.schema, getWorkflowStatusesTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalledWith({});
  });

  it("rejects invalid action", async () => {
    const h = wrapHandler(getWorkflowStatusesTool.schema, getWorkflowStatusesTool.handler);
    expect((await h({ action: "archived" })).isError).toBe(true);
  });
});
