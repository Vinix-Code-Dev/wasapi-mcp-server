import { describe, it, expect, vi } from "vitest";
import { listTemplatesTool } from "../../../src/tools/whatsapp/list-templates.js";
import { getTemplateTool } from "../../../src/tools/whatsapp/get-template.js";
import { getTemplateFieldsTool } from "../../../src/tools/whatsapp/get-template-fields.js";
import { listTemplatesByNumberTool } from "../../../src/tools/whatsapp/list-templates-by-number.js";
import { syncMetaTemplatesTool } from "../../../src/tools/whatsapp/sync-meta-templates.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getWhatsappTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWhatsappTemplate: vi.fn().mockResolvedValue({ success: true, data: { uuid: "t1" } }),
  getFieldsTemplate: vi.fn().mockResolvedValue({ fields: [] }),
  getTemplatesByAppId: vi.fn().mockResolvedValue([]),
  syncMetaTemplates: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: mocks }),
}));

describe("templates tools", () => {
  it("list_whatsapp_templates takes no args", async () => {
    const h = wrapHandler(listTemplatesTool.schema, listTemplatesTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mocks.getWhatsappTemplates).toHaveBeenCalled();
  });

  it("get_whatsapp_template requires template_uuid", async () => {
    const h = wrapHandler(getTemplateTool.schema, getTemplateTool.handler);
    expect((await h({})).isError).toBe(true);
    const ok = await h({ template_uuid: "t1" });
    expect(ok.isError).toBeFalsy();
    expect(mocks.getWhatsappTemplate).toHaveBeenCalledWith({ template_uuid: "t1" });
  });

  it("get_template_fields passes uuid as positional arg", async () => {
    const h = wrapHandler(getTemplateFieldsTool.schema, getTemplateFieldsTool.handler);
    await h({ template_uuid: "t2" });
    expect(mocks.getFieldsTemplate).toHaveBeenCalledWith("t2");
  });

  it("list_templates_by_number requires from_id", async () => {
    const h = wrapHandler(listTemplatesByNumberTool.schema, listTemplatesByNumberTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ from_id: 99 });
    expect(mocks.getTemplatesByAppId).toHaveBeenCalledWith({ from_id: 99 });
  });

  it("sync_meta_templates takes no args", async () => {
    const h = wrapHandler(syncMetaTemplatesTool.schema, syncMetaTemplatesTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mocks.syncMetaTemplates).toHaveBeenCalled();
  });
});
