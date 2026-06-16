import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ label_id: z.string().min(1) });

export const deleteLabelTool: ToolDefinition<typeof schema> = {
  name: "delete_label",
  description: "Elimina una etiqueta por su ID. Operación irreversible.",
  schema,
  handler: async ({ label_id }) => {
    const client = getClient();
    return await (client.labels as any).delete(label_id);
  },
};
