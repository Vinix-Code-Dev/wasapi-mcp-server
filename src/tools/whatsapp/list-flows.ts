import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listFlowsTool: ToolDefinition<typeof schema> = {
  name: "list_flows",
  description: "Lista todos los WhatsApp Flows de la cuenta.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.whatsapp as any).getFlows();
  },
};
