import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listWhatsappNumbersTool: ToolDefinition<typeof schema> = {
  name: "list_whatsapp_numbers",
  description: "Lista los números de WhatsApp conectados a la cuenta Wasapi. Devuelve los from_id disponibles para enviar mensajes.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.whatsapp as any).getWhatsappNumbers();
  },
};
