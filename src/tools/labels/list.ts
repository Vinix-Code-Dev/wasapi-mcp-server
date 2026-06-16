import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listLabelsTool: ToolDefinition<typeof schema> = {
  name: "list_labels",
  description: "Lista todas las etiquetas (labels) de la cuenta.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.labels as any).getAll();
  },
};
