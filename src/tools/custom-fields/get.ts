// src/tools/custom-fields/get.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ field_id: z.string().min(1) });

export const getCustomFieldTool: ToolDefinition<typeof schema> = {
  name: "get_custom_field",
  description: "Obtiene un campo personalizado por su ID.",
  schema,
  handler: async ({ field_id }) => {
    const client = getClient();
    return await (client.customFields as any).getById(field_id);
  },
};
