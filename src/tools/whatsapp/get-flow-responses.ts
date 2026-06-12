import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  flow_id: z.string().min(1),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(200).optional(),
});

export const getFlowResponsesTool: ToolDefinition<typeof schema> = {
  name: "get_flow_responses",
  description: "Obtiene las respuestas que los usuarios enviaron a través de un WhatsApp Flow (paginado).",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await (client.whatsapp as any).getFlowResponses(args);
  },
};
