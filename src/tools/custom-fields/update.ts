// src/tools/custom-fields/update.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  field_id: z.string().min(1),
  name: z.string().min(1),
});

export const updateCustomFieldTool: ToolDefinition<typeof schema> = {
  name: "update_custom_field",
  description: "Actualiza el nombre de un campo personalizado existente.",
  schema,
  handler: async ({ field_id, name }) => {
    const client = getClient();
    return await (client.customFields as any).update({ id: field_id, data: { name } });
  },
};
