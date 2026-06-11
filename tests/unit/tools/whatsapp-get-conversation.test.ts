// tests/unit/tools/whatsapp-get-conversation.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConversationTool } from "../../../src/tools/whatsapp/get-conversation.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const getConversationMock = vi.fn().mockResolvedValue({
  messages: [{ id: "m1", text: "hola" }],
  page: 1,
});
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { getConversation: getConversationMock } }),
}));

describe("get_conversation", () => {
  beforeEach(() => {
    getConversationMock.mockClear();
  });

  it("gets conversation by wa_id with no optional params", async () => {
    const h = wrapHandler(getConversationTool.schema, getConversationTool.handler);
    const res = await h({ wa_id: "5571999000000" });
    expect(res.isError).toBeFalsy();
    const body = JSON.parse(res.content[0].text);
    expect(body.messages).toBeDefined();
    expect(getConversationMock).toHaveBeenCalledWith({ wa_id: "5571999000000" });
  });

  it("passes from_id and page when provided", async () => {
    const h = wrapHandler(getConversationTool.schema, getConversationTool.handler);
    const res = await h({ wa_id: "5571999000000", from_id: 10, page: 2 });
    expect(res.isError).toBeFalsy();
    expect(getConversationMock).toHaveBeenCalledWith({ wa_id: "5571999000000", from_id: 10, page: 2 });
  });

  it("passes only from_id when page omitted", async () => {
    const h = wrapHandler(getConversationTool.schema, getConversationTool.handler);
    await h({ wa_id: "5571999000000", from_id: 10 });
    expect(getConversationMock).toHaveBeenCalledWith({ wa_id: "5571999000000", from_id: 10 });
  });

  it("rejects missing wa_id", async () => {
    const h = wrapHandler(getConversationTool.schema, getConversationTool.handler);
    const res = await h({});
    expect(res.isError).toBe(true);
  });
});
