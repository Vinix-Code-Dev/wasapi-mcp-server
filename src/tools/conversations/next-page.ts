import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { conversationFilters } from "./filters.js";

const schema = z.object({
  cursor: z.string().min(1),
  ...conversationFilters,
});

export const getConversationsNextPageTool: ToolDefinition<typeof schema> = {
  name: "get_conversations_next_page",
  description: "Obtiene la siguiente página de conversaciones usando el cursor devuelto por list_conversations.",
  schema,
  handler: async ({ cursor, ...rest }) => {
    const client = getClient();
    return await (client.conversations as any).getNextPage(cursor, rest);
  },
};
