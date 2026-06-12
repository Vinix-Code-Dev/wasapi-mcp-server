import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listCampaignsTool: ToolDefinition<typeof schema> = {
  name: "list_campaigns",
  description: "Lista todas las campañas de difusión de WhatsApp de la cuenta Wasapi.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.campaigns as any).getAll();
  },
};
