// tests/unit/tools/whatsapp-send-template.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTemplateTool } from "../../../src/tools/whatsapp/send-template.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const sendMock = vi.fn().mockResolvedValue({ id: "tmpl-1", status: "sent" });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { sendTemplate: sendMock } }),
}));

vi.mock("../../../src/config.js", () => ({
  loadConfig: vi.fn().mockReturnValue({ apiKey: "k", fromId: 10 }),
}));

describe("send_template", () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it("sends template with required fields and from_id fallback (recipients joined to CSV)", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({
      recipients: ["5571999000000"],
      template_id: "uuid-1234",
      contact_type: "phone",
    });
    expect(res.isError).toBeFalsy();
    expect(sendMock).toHaveBeenCalledWith({
      recipients: "5571999000000",
      template_id: "uuid-1234",
      contact_type: "phone",
      from_id: 10,
    });
  });

  it("sends template with explicit from_id (multiple recipients joined to CSV)", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({
      recipients: ["5571999000000", "5571888000000"],
      template_id: "uuid-5678",
      contact_type: "contact",
      from_id: 42,
    });
    expect(res.isError).toBeFalsy();
    expect(sendMock).toHaveBeenCalledWith({
      recipients: "5571999000000,5571888000000",
      template_id: "uuid-5678",
      contact_type: "contact",
      from_id: 42,
    });
  });

  it("rejects missing recipients", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({ template_id: "uuid-1234", contact_type: "phone" });
    expect(res.isError).toBe(true);
  });

  it("rejects missing template_id", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({ recipients: ["5571999000000"], contact_type: "phone" });
    expect(res.isError).toBe(true);
  });

  it("rejects missing contact_type", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    const res = await h({ recipients: ["5571999000000"], template_id: "uuid-1234" });
    expect(res.isError).toBe(true);
  });

  it("joins recipients array into CSV string for the SDK", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    await h({ recipients: ["57300", "57311"], template_id: "t1", contact_type: "phone" });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ recipients: "57300,57311" }));
  });

  it("passes template variables through", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    await h({
      recipients: ["57300"],
      template_id: "t1",
      contact_type: "phone",
      body_vars: [{ text: "{{1}}", val: "Ana" }],
      url_file: "https://x.com/a.pdf",
      file_name: "contrato.pdf",
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body_vars: [{ text: "{{1}}", val: "Ana" }],
        url_file: "https://x.com/a.pdf",
        file_name: "contrato.pdf",
      }),
    );
  });

  it("rejects invalid contact_type", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    expect((await h({ recipients: ["57300"], template_id: "t1", contact_type: "group" })).isError).toBe(true);
  });
});
