import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { WA_ID_DESCRIPTION } from "../../lib/recipient.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

// SDK 2.x: whatsapp.sendAttachment({ wa_id, filePath, caption?, filename?, from_id? }).
// Despite the param name `filePath`, the SDK forwards it to the API as a URL
// (image_url/video_url/document_url/audio_url) and infers the media type from
// the file EXTENSION. So the value must be a PUBLIC URL, not a local path.
// Unrecognized extensions are sent as document_url.
const schema = z.object({
  wa_id: z.string().min(1).describe(WA_ID_DESCRIPTION),
  file_url: z
    .string()
    .url()
    .describe(
      "URL pública del archivo. El tipo (imagen/video/audio/documento) se infiere de la extensión de la URL; sin extensión reconocida se envía como documento.",
    ),
  caption: z.string().optional().describe("Texto descriptivo opcional para el adjunto"),
  filename: z.string().optional().describe("Nombre con el que el destinatario recibe el archivo (útil para documentos)"),
  from_id: z.number().int().positive().optional().describe("ID del número de WhatsApp emisor. Usa WASAPI_FROM_ID si se omite."),
});

export const sendAttachmentTool: ToolDefinition<typeof schema> = {
  name: "send_attachment",
  description:
    "Envía un archivo adjunto por WhatsApp desde una URL pública (imagen, video, audio o documento). El tipo se infiere de la extensión de la URL. from_id es opcional si WASAPI_FROM_ID está configurado.",
  schema,
  handler: async ({ wa_id, file_url, caption, filename, from_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    // The SDK param is still named `filePath`, but it carries the URL.
    const params: Record<string, unknown> = { wa_id, filePath: file_url, from_id: resolved };
    if (caption !== undefined) params.caption = caption;
    if (filename !== undefined) params.filename = filename;
    return await (client.whatsapp as any).sendAttachment(params);
  },
};
