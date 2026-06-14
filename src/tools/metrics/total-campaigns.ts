import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getTotalCampaignsTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_total_campaigns",
  description: "Métrica: total de campañas en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getTotalCampaigns(toSdkDates(args));
  },
};
