import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

// SDK: whatsapp.getConversation({ wa_id, from_id?, page? })
// NOTE: This is NOT a conversation-by-ID lookup. It fetches the message thread
// with a specific contact (identified by wa_id). There is no opaque conversation ID.
//
// list_conversations is NOT implemented — the SDK has no listConversations method.
// This is an SDK gap; tracked as a follow-up issue.
const schema = z.object({
  wa_id: z.string().min(1).describe("WhatsApp ID del contacto (E.164 sin +). Devuelve el hilo de mensajes con ese contacto."),
  from_id: z.number().int().positive().optional().describe("Filtrar por número WhatsApp específico. Opcional si solo hay uno."),
  page: z.number().int().positive().optional().describe("Número de página para paginación del hilo de mensajes"),
});

export const getConversationTool: ToolDefinition<typeof schema> = {
  name: "get_conversation",
  description: [
    "Obtiene el hilo de mensajes con un contacto de WhatsApp (identificado por wa_id).",
    "Nota: no es un lookup por ID de conversación — el SDK identifica la conversación por contacto (wa_id).",
    "list_conversations no está implementado (SDK gap).",
  ].join(" "),
  schema,
  handler: async ({ wa_id, from_id, page }) => {
    const client = getClient();
    const params: Record<string, unknown> = { wa_id };
    if (from_id !== undefined) params.from_id = from_id;
    if (page !== undefined) params.page = page;
    return await (client.whatsapp as any).getConversation(params);
  },
};
