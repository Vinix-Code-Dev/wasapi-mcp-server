import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getMessagesTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_messages",
  description: "Métrica: volumen de mensajes en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getMessages(toSdkDates(args));
  },
};
