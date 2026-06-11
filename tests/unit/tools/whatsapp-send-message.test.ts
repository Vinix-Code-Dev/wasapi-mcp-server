// tests/unit/tools/whatsapp-send-message.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessageTool } from "../../../src/tools/whatsapp/send-message.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const sendMock = vi.fn().mockResolvedValue({ id: "msg-1", status: "sent" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { sendMessage: sendMock } }),
}));

vi.mock("../../../src/config.js", () => ({
  loadConfig: vi.fn().mockReturnValue({ apiKey: "k", fromId: 99 }),
}));

describe("send_message", () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it("sends message with explicit from_id", async () => {
    const h = wrapHandler(sendMessageTool.schema, sendMessageTool.handler);
    const res = await h({ wa_id: "5571999", message: "hi", from_id: 42 });
    expect(res.isError).toBeFalsy();
    expect(sendMock).toHaveBeenCalledWith({ wa_id: "5571999", message: "hi", from_id: 42 });
  });

  it("falls back to config fromId when from_id not provided", async () => {
    const h = wrapHandler(sendMessageTool.schema, sendMessageTool.handler);
    const res = await h({ wa_id: "5571999", message: "hello" });
    expect(res.isError).toBeFalsy();
    expect(sendMock).toHaveBeenCalledWith({ wa_id: "5571999", message: "hello", from_id: 99 });
  });

  it("rejects missing wa_id", async () => {
    const h = wrapHandler(sendMessageTool.schema, sendMessageTool.handler);
    const res = await h({ message: "hi" });
    expect(res.isError).toBe(true);
  });

  it("rejects missing message", async () => {
    const h = wrapHandler(sendMessageTool.schema, sendMessageTool.handler);
    const res = await h({ wa_id: "5571999" });
    expect(res.isError).toBe(true);
  });
});
