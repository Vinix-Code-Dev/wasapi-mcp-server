import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const getStatusContactsTool: ToolDefinition<typeof schema> = {
  name: "get_status_contacts",
  description: "Métrica: conteo de contactos por estado de conversación.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.metrics as any).getStatusContacts();
  },
};
