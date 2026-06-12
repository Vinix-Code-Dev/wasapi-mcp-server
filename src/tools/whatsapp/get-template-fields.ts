import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  template_uuid: z.string().min(1),
});

export const getTemplateFieldsTool: ToolDefinition<typeof schema> = {
  name: "get_template_fields",
  description: "Obtiene los campos/variables que acepta una plantilla (útil antes de enviar con send_template y body_vars).",
  schema,
  handler: async ({ template_uuid }) => {
    const client = getClient();
    return await (client.whatsapp as any).getFieldsTemplate(template_uuid);
  },
};
