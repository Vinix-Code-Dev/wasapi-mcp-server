import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  contact_uuid: z.string().min(1),
});

export const assignAgentTool: ToolDefinition<typeof schema> = {
  name: "assign_agent_to_contact",
  description: "Asigna automáticamente un agente al contacto (rotación automática de Wasapi). Usa el contact_uuid del contacto.",
  schema,
  handler: async ({ contact_uuid }) => {
    const client = getClient();
    return await (client.contacts as any).assingAgentAutomatic({ contact_uuid });
  },
};
