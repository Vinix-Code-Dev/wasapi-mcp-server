// tests/unit/tools/whatsapp-send-template.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTemplateTool } from "../../../src/tools/whatsapp/send-template.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const sendTemplateMock = vi.fn().mockResolvedValue({ id: "tmpl-1", status: "sent" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { sendTemplate: sendTemplateMock } }),
}));

vi.mock("../../../src/config.js", () => ({
  loadConfig: vi.fn().mockReturnValue({ apiKey: "k", fromId: 10 }),
}));

describe("send_template", () => {
  beforeEach(() => {
    sendTemplateMock.mockClear();
  });

  it("sends template with required fields and from_id fallback", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({
      recipients: ["5571999000000"],
      template_id: "uuid-1234",
      contact_type: "individual",
    });
    expect(res.isError).toBeFalsy();
    expect(sendTemplateMock).toHaveBeenCalledWith({
      recipients: ["5571999000000"],
      template_id: "uuid-1234",
      contact_type: "individual",
      from_id: 10,
    });
  });

  it("sends template with explicit from_id", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({
      recipients: ["5571999000000", "5571888000000"],
      template_id: "uuid-5678",
      contact_type: "group",
      from_id: 42,
    });
    expect(res.isError).toBeFalsy();
    expect(sendTemplateMock).toHaveBeenCalledWith({
      recipients: ["5571999000000", "5571888000000"],
      template_id: "uuid-5678",
      contact_type: "group",
      from_id: 42,
    });
  });

  it("rejects missing recipients", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({ template_id: "uuid-1234", contact_type: "individual" });
    expect(res.isError).toBe(true);
  });

  it("rejects missing template_id", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({ recipients: ["5571999000000"], contact_type: "individual" });
    expect(res.isError).toBe(true);
  });

  it("rejects missing contact_type", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({ recipients: ["5571999000000"], template_id: "uuid-1234" });
    expect(res.isError).toBe(true);
  });
});
