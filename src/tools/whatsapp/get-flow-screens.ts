import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  flow_id: z.string().min(1),
  phone_id: z.number().int().positive().optional(),
});

export const getFlowScreensTool: ToolDefinition<typeof schema> = {
  name: "get_flow_screens",
  description: "Lista las pantallas de un WhatsApp Flow (útil para elegir el parámetro screen de send_flow).",
  schema,
  handler: async ({ flow_id, phone_id }) => {
    const client = getClient();
    return await (client.whatsapp as any).getFlowScreens({ flow_id, phone_id: resolveFromId(phone_id) });
  },
};
