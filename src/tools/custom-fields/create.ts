// src/tools/custom-fields/create.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ name: z.string().min(1) });

export const createCustomFieldTool: ToolDefinition<typeof schema> = {
  name: "create_custom_field",
  description: "Crea un campo personalizado nuevo con el nombre indicado.",
  schema,
  handler: async ({ name }) => {
    const client = getClient();
    return await (client.customFields as any).create({ name });
  },
};
