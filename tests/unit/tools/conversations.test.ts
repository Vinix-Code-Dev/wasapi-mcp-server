// tests/unit/tools/conversations.test.ts
import { describe, it, expect, vi } from "vitest";
import { listConversationsTool } from "../../../src/tools/conversations/list.js";
import { getConversationsNextPageTool } from "../../../src/tools/conversations/next-page.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ data: [], next_cursor: "abc" }),
  getNextPage: vi.fn().mockResolvedValue({ data: [] }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ conversations: mocks }),
}));

describe("list_conversations", () => {
  it("works with no args", async () => {
    const h = wrapHandler(listConversationsTool.schema, listConversationsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalledWith({});
  });

  it("passes filters through unchanged", async () => {
    const h = wrapHandler(listConversationsTool.schema, listConversationsTool.handler);
    await h({ status: "open", query: "ana", per_page: 20 });
    expect(mocks.getAll).toHaveBeenCalledWith({ status: "open", query: "ana", per_page: 20 });
  });

  it("rejects invalid status enum", async () => {
    const h = wrapHandler(listConversationsTool.schema, listConversationsTool.handler);
    expect((await h({ status: "archived" })).isError).toBe(true);
  });
});

describe("get_conversations_next_page", () => {
  it("requires cursor and passes it positionally with filters", async () => {
    const h = wrapHandler(getConversationsNextPageTool.schema, getConversationsNextPageTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ cursor: "abc", status: "closed" });
    expect(mocks.getNextPage).toHaveBeenCalledWith("abc", { status: "closed" });
  });
});
