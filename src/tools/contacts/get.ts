import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  wa_id: z.string().min(1),
});

export const getContactTool: ToolDefinition<typeof schema> = {
  name: "get_contact",
  description: "Obtiene un contacto por su wa_id (WhatsApp ID, p.ej. número de teléfono internacional sin +).",
  schema,
  handler: async ({ wa_id }) => {
    const client = getClient();
    return await (client.contacts as any).getById(wa_id);
  },
};
