import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

// SDK: whatsapp.sendMessage({ wa_id, message, from_id? })
// Note: SDK uses wa_id (not "to") to identify the recipient.
const schema = z.object({
  wa_id: z.string().min(1).describe("WhatsApp ID of the recipient (E.164 without +, e.g. 5571999000000)"),
  message: z.string().min(1),
  from_id: z.number().int().positive().optional().describe("WhatsApp number ID to send from. Falls back to WASAPI_FROM_ID env var. Use list_whatsapp_numbers to discover."),
});

export const sendMessageTool: ToolDefinition<typeof schema> = {
  name: "send_message",
  description: "Envía un mensaje de texto por WhatsApp. from_id es opcional si WASAPI_FROM_ID está configurado como variable de entorno.",
  schema,
  handler: async ({ wa_id, message, from_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await (client.whatsapp as any).sendMessage({ wa_id, message, from_id: resolved });
  },
};
