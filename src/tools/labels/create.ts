import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  title: z.string().min(1),
  color: z.string().min(1).describe("Color en hex, p.ej. #ff0000"),
  description: z.string().optional(),
});

export const createLabelTool: ToolDefinition<typeof schema> = {
  name: "create_label",
  description: "Crea una etiqueta nueva con título, color y descripción opcional.",
  schema,
  handler: async ({ title, color, description }) => {
    const client = getClient();
    return await (client.labels as any).create({ title, color, description });
  },
};
