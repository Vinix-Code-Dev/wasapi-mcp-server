import { describe, it, expect, vi } from "vitest";
import { assignAgentTool } from "../../../src/tools/contacts/assign-agent.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue({ success: true, data: { id: 1 } });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { assingAgentAutomatic: mock } }),
}));

describe("assign_agent_to_contact", () => {
  it("assigns agent by contact_uuid", async () => {
    const h = wrapHandler(assignAgentTool.schema, assignAgentTool.handler);
    const res = await h({ contact_uuid: "abc-123" });
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalledWith({ contact_uuid: "abc-123" });
  });

  it("rejects missing contact_uuid", async () => {
    const h = wrapHandler(assignAgentTool.schema, assignAgentTool.handler);
    const res = await h({});
    expect(res.isError).toBe(true);
  });
});
