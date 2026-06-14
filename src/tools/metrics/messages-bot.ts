import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getMessagesBotTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_messages_bot",
  description: "Métrica: volumen de mensajes enviados por el bot en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getMessagesBot(toSdkDates(args));
  },
};
