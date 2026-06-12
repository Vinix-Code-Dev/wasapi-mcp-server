import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  from_id: z.number().int().positive().optional(),
});

export const listFlowsByNumberTool: ToolDefinition<typeof schema> = {
  name: "list_flows_by_number",
  description: "Lista los WhatsApp Flows disponibles para un número específico (from_id; usa el default si se omite).",
  schema,
  handler: async ({ from_id }) => {
    const client = getClient();
    return await (client.whatsapp as any).getFlowsByPhoneId(resolveFromId(from_id));
  },
};
