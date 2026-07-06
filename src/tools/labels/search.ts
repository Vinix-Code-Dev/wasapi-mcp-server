import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ name: z.string().min(1) });

export const searchLabelsTool: ToolDefinition<typeof schema> = {
  name: "search_labels",
  description: "Busca una etiqueta por su nombre EXACTO (no es búsqueda parcial). Devuelve la etiqueta si el título coincide exactamente.",
  schema,
  handler: async ({ name }) => {
    const client = getClient();
    return await (client.labels as any).getSearch(name);
  },
};
