import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getAgentConversationsTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_agent_conversations",
  description: "Métrica: conversaciones por agente en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getAgentConversations(toSdkDates(args));
  },
};
