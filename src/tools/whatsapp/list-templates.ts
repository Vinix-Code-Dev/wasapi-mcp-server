import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listTemplatesTool: ToolDefinition<typeof schema> = {
  name: "list_whatsapp_templates",
  description: "Lista todas las plantillas de WhatsApp de la cuenta.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.whatsapp as any).getWhatsappTemplates();
  },
};
