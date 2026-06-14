// src/tools/custom-fields/delete.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ field_id: z.string().min(1) });

export const deleteCustomFieldTool: ToolDefinition<typeof schema> = {
  name: "delete_custom_field",
  description: "Elimina un campo personalizado por su ID. Operación irreversible.",
  schema,
  handler: async ({ field_id }) => {
    const client = getClient();
    return await (client.customFields as any).delete(field_id);
  },
};
