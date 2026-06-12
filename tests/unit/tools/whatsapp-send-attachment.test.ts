// tests/unit/tools/whatsapp-send-attachment.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendAttachmentTool } from "../../../src/tools/whatsapp/send-attachment.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const sendAttachmentMock = vi.fn().mockResolvedValue({ id: "att-1", status: "sent" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { sendAttachment: sendAttachmentMock } }),
}));

vi.mock("../../../src/config.js", () => ({
  loadConfig: vi.fn().mockReturnValue({ apiKey: "k", fromId: 5 }),
}));

describe("send_attachment", () => {
  beforeEach(() => {
    sendAttachmentMock.mockClear();
  });

  it("sends attachment with required fields and from_id fallback", async () => {
    const h = wrapHandler(sendAttachmentTool.schema, sendAttachmentTool.handler);
    const res = await h({ wa_id: "5571999000000", filePath: "/tmp/file.pdf" });
    expect(res.isError).toBeFalsy();
    expect(sendAttachmentMock).toHaveBeenCalledWith({
      wa_id: "5571999000000",
      filePath: "/tmp/file.pdf",
      from_id: 5,
    });
  });

  it("sends attachment with caption and explicit from_id", async () => {
    const h = wrapHandler(sendAttachmentTool.schema, sendAttachmentTool.handler);
    const res = await h({
      wa_id: "5571999000000",
      filePath: "/tmp/image.jpg",
      caption: "Check this out",
      from_id: 99,
    });
    expect(res.isError).toBeFalsy();
    expect(sendAttachmentMock).toHaveBeenCalledWith({
      wa_id: "5571999000000",
      filePath: "/tmp/image.jpg",
      caption: "Check this out",
      from_id: 99,
    });
  });

  it("rejects missing wa_id", async () => {
    const h = wrapHandler(sendAttachmentTool.schema, sendAttachmentTool.handler);
    const res = await h({ filePath: "/tmp/file.pdf" });
    expect(res.isError).toBe(true);
  });

  it("rejects missing filePath", async () => {
    const h = wrapHandler(sendAttachmentTool.schema, sendAttachmentTool.handler);
    const res = await h({ wa_id: "5571999000000" });
    expect(res.isError).toBe(true);
  });

  it("passes optional filename through", async () => {
    const h = wrapHandler(sendAttachmentTool.schema, sendAttachmentTool.handler);
    await h({ wa_id: "57300", filePath: "/tmp/a.pdf", filename: "propuesta.pdf" });
    expect(sendAttachmentMock).toHaveBeenCalledWith(expect.objectContaining({ filename: "propuesta.pdf" }));
  });
});
