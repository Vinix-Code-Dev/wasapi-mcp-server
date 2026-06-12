import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  campaign_uuid: z.string().min(1),
});

export const getCampaignTool: ToolDefinition<typeof schema> = {
  name: "get_campaign",
  description:
    "Obtiene el detalle de una campaña por su UUID, incluyendo los envíos (jobs) por contacto y su estado. Usa list_campaigns para descubrir los UUID.",
  schema,
  handler: async ({ campaign_uuid }) => {
    const client = getClient();
    return await (client.campaigns as any).getById(campaign_uuid);
  },
};
