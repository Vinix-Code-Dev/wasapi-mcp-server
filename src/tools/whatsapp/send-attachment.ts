import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

// SDK: whatsapp.sendAttachment({ wa_id, filePath, caption?, filename?, from_id? })
// CONCERN: SDK takes filePath (local filesystem path), not a URL.
// This means Claude cannot send remote URLs as attachments without first downloading
// the file to disk. A future SDK PR should add URL-based attachment support.
// The plan's original 'url' + 'type' params do NOT exist in the SDK.
const schema = z.object({
  wa_id: z.string().min(1).describe("WhatsApp ID of the recipient (E.164 sin +)"),
  filePath: z.string().min(1).describe("Ruta local al archivo a enviar. SDK gap: URL-based attachment no disponible — requiere PR al SDK."),
  caption: z.string().optional().describe("Texto descriptivo opcional para el adjunto"),
  from_id: z.number().int().positive().optional().describe("WhatsApp number ID to send from. Falls back to WASAPI_FROM_ID env var."),
});

export const sendAttachmentTool: ToolDefinition<typeof schema> = {
  name: "send_attachment",
  description: [
    "Envía un archivo adjunto por WhatsApp usando una ruta de archivo local.",
    "LIMITACIÓN SDK: Solo acepta filePath (ruta local), no URLs remotas.",
    "Para enviar URLs, se necesita descargar el archivo primero.",
    "from_id es opcional si WASAPI_FROM_ID está configurado.",
  ].join(" "),
  schema,
  handler: async ({ wa_id, filePath, caption, from_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    const params: Record<string, unknown> = { wa_id, filePath, from_id: resolved };
    if (caption !== undefined) params.caption = caption;
    return await (client.whatsapp as any).sendAttachment(params);
  },
};
