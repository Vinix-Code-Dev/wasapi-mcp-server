// tests/unit/tools/user.test.ts
import { describe, it, expect, vi } from "vitest";
import { getCurrentUserTool } from "../../../src/tools/user/get-user.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue({ success: true, data: { id: 1, name: "Ana" } });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ user: { getUser: mock } }),
}));

describe("get_current_user", () => {
  it("takes no args and returns the user", async () => {
    const h = wrapHandler(getCurrentUserTool.schema, getCurrentUserTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalled();
    expect(JSON.parse(res.content[0].text).data.name).toBe("Ana");
  });
});
