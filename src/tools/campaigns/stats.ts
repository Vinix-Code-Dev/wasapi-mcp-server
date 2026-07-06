import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getCampaignStats } from "../../lib/campaigns-api.js";

const schema = z.object({
  campaign_uuid: z.string().min(1).describe("UUID de la campaña (de create_campaign o list_campaigns)"),
});

export const getCampaignStatsTool: ToolDefinition<typeof schema> = {
  name: "get_campaign_stats",
  description:
    "Obtiene los conteos de entrega por estado (enviado, entregado, leído, fallido, etc.) de una campaña, por su UUID. Útil tras enviarla.",
  schema,
  handler: async ({ campaign_uuid }) => {
    return await getCampaignStats(campaign_uuid);
  },
};
