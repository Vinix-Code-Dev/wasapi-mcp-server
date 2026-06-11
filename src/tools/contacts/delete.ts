import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

// SDK: contacts.delete(wa_id: string)
const schema = z.object({
  wa_id: z.string().min(1),
});

export const deleteContactTool: ToolDefinition<typeof schema> = {
  name: "delete_contact",
  description: "Elimina un contacto por su wa_id. Operación irreversible.",
  schema,
  handler: async ({ wa_id }) => {
    const client = getClient();
    return await (client.contacts as any).delete(wa_id);
  },
};
