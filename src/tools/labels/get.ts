import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ label_id: z.string().min(1) });

export const getLabelTool: ToolDefinition<typeof schema> = {
  name: "get_label",
  description: "Obtiene una etiqueta por su ID.",
  schema,
  handler: async ({ label_id }) => {
    const client = getClient();
    return await (client.labels as any).getById(label_id);
  },
};
