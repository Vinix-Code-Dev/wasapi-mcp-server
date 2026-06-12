import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  wa_id: z.string().min(1),
  status: z.enum(["open", "hold", "closed"]),
  from_id: z.number().int().positive().optional(),
  message: z.string().optional(),
  agent_id: z.number().int().positive().optional(),
  send_end_message: z.boolean().optional(),
});

export const changeStatusTool: ToolDefinition<typeof schema> = {
  name: "change_conversation_status",
  description: "Cambia el estado de la conversación con un contacto: open, hold o closed. Opcionalmente asigna agente o envía mensaje de cierre.",
  schema,
  handler: async ({ wa_id, status, from_id, ...rest }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await (client.whatsapp as any).changeStatus({ wa_id, status, from_id: resolved, ...rest });
  },
};
