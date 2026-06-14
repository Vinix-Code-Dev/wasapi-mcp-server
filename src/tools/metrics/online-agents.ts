import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const getOnlineAgentsTool: ToolDefinition<typeof schema> = {
  name: "get_online_agents",
  description: "Métrica: lista de agentes actualmente en línea.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.metrics as any).getOnlineAgents();
  },
};
