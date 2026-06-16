import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  label_id: z.string().min(1),
  title: z.string().min(1),
  color: z.string().min(1),
  description: z.string().optional(),
});

export const updateLabelTool: ToolDefinition<typeof schema> = {
  name: "update_label",
  description: "Actualiza una etiqueta existente (título, color, descripción).",
  schema,
  handler: async ({ label_id, title, color, description }) => {
    const client = getClient();
    return await (client.labels as any).update({ id: label_id, data: { title, color, description } });
  },
};
