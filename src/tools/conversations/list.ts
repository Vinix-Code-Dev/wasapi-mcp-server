import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { conversationFilters } from "./filters.js";

const schema = z.object({
  ...conversationFilters,
  cursor: z.string().optional().describe("Cursor de paginación; normalmente usa get_conversations_next_page"),
});

export const listConversationsTool: ToolDefinition<typeof schema> = {
  name: "list_conversations",
  description: "Lista las conversaciones de la cuenta (paginado por cursor) con filtros opcionales por estado, texto, teléfonos, etiquetas, agentes y fechas. Distinto de get_conversation, que trae el hilo de mensajes con un contacto puntual.",
  schema,
  handler: async (args) => {
    const client = getClient();
    // Drop keys the caller didn't provide so the SDK never sees `undefined`
    // filter values (consistent with get_conversations_next_page).
    const params = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));
    return await (client.conversations as any).getAll(params);
  },
};
