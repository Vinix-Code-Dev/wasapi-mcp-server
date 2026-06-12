import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  template_uuid: z.string().min(1),
});

export const getTemplateTool: ToolDefinition<typeof schema> = {
  name: "get_whatsapp_template",
  description: "Obtiene el detalle de una plantilla de WhatsApp por su UUID.",
  schema,
  handler: async ({ template_uuid }) => {
    const client = getClient();
    return await (client.whatsapp as any).getWhatsappTemplate({ template_uuid });
  },
};
