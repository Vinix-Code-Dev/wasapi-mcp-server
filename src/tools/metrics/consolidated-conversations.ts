import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getConsolidatedConversationsTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_consolidated_conversations",
  description: "Métrica: conversaciones consolidadas en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getConsolidatedConversations(toSdkDates(args));
  },
};
