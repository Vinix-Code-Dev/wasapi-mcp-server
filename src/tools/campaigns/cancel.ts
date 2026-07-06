import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { cancelCampaign } from "../../lib/campaigns-api.js";

const schema = z.object({
  campaign_uuid: z.string().min(1).describe("UUID de la campaña a cancelar"),
});

export const cancelCampaignTool: ToolDefinition<typeof schema> = {
  name: "cancel_campaign",
  description:
    "Cancela una campaña programada (por su UUID) si aún está en estado 'scheduled', y cancela sus envíos pendientes. Solo opera sobre campañas de la cuenta.",
  schema,
  handler: async ({ campaign_uuid }) => {
    return await cancelCampaign(campaign_uuid);
  },
};
