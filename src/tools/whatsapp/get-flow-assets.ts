import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  flow_id: z.string().min(1),
  phone_id: z.number().int().positive().optional(),
});

export const getFlowAssetsTool: ToolDefinition<typeof schema> = {
  name: "get_flow_assets",
  description: "Obtiene el detalle y los assets de un WhatsApp Flow (definición, pantallas, si usa data API).",
  schema,
  handler: async ({ flow_id, phone_id }) => {
    const client = getClient();
    return await (client.whatsapp as any).getFlowAssets({ flow_id, phone_id: resolveFromId(phone_id) });
  },
};
