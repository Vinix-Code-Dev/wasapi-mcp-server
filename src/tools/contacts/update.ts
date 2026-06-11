import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

// SDK: contacts.update({ wa_id, data }) — takes an object with wa_id and data
const schema = z.object({
  wa_id: z.string().min(1),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  country_code: z.string().optional(),
  email: z.string().email().optional(),
});

export const updateContactTool: ToolDefinition<typeof schema> = {
  name: "update_contact",
  description: "Actualiza un contacto existente. wa_id es requerido; los demás campos son opcionales.",
  schema,
  handler: async ({ wa_id, ...rest }) => {
    const client = getClient();
    return await (client.contacts as any).update({ wa_id, data: rest });
  },
};
