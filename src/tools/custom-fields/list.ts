// src/tools/custom-fields/list.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listCustomFieldsTool: ToolDefinition<typeof schema> = {
  name: "list_custom_fields",
  description: "Lista todos los campos personalizados (custom fields) de la cuenta.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.customFields as any).getAll();
  },
};
