import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

// SDK: contacts.removeLabel({ contact_uuid, label_id: number[] })
// MCP tool accepts single label_id (number); handler wraps as [label_id]
const schema = z.object({
  contact_uuid: z.string().min(1),
  label_id: z.number().int().positive(),
});

export const removeLabelTool: ToolDefinition<typeof schema> = {
  name: "remove_label_from_contact",
  description: "Quita una etiqueta (label) de un contacto. Usa contact_uuid (UUID del contacto) y label_id (número).",
  schema,
  handler: async ({ contact_uuid, label_id }) => {
    const client = getClient();
    return await (client.contacts as any).removeLabel({ contact_uuid, label_id: [label_id] });
  },
};
