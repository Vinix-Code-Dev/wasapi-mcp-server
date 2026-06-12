import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  from_id: z.number().int().positive(),
});

export const listTemplatesByNumberTool: ToolDefinition<typeof schema> = {
  name: "list_templates_by_number",
  description: "Lista las plantillas disponibles para un número de WhatsApp específico (from_id).",
  schema,
  handler: async ({ from_id }) => {
    const client = getClient();
    return await (client.whatsapp as any).getTemplatesByAppId({ from_id });
  },
};
