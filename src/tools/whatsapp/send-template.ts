import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const templateVar = z.object({
  text: z.string().describe("Nombre del placeholder en la plantilla, p.ej. {{1}}"),
  val: z.union([z.string(), z.number()]).describe("Valor a sustituir"),
});

const schema = z.object({
  recipients: z.array(z.string().min(1)).min(1).describe("wa_ids destino (E.164 sin +)"),
  template_id: z.string().min(1).describe("UUID de la plantilla (ver list_whatsapp_templates)"),
  contact_type: z.enum(["phone", "contact"]),
  from_id: z.number().int().positive().optional(),
  body_vars: z.array(templateVar).optional().describe("Variables del cuerpo de la plantilla"),
  header_var: z.array(templateVar).optional().describe("Variable del encabezado"),
  cta_var: z.array(templateVar).optional().describe("Variable del botón CTA"),
  url_file: z.string().url().optional().describe("URL pública de archivo adjunto (imagen/video/documento/audio)"),
  file_name: z.string().optional(),
  chatbot_status: z.enum(["enable", "disable", "disable_permanently"]).optional(),
  conversation_status: z.enum(["open", "hold", "closed", "unchanged"]).optional(),
  agent_id: z.number().int().positive().optional(),
});

export const sendTemplateTool: ToolDefinition<typeof schema> = {
  name: "send_template",
  description:
    "Envía una plantilla aprobada de WhatsApp a uno o más destinatarios. Soporta variables (body_vars/header_var/cta_var — consulta get_template_fields para conocerlas) y adjuntos por URL (url_file). from_id es opcional si WASAPI_FROM_ID está configurado.",
  schema,
  handler: async ({ recipients, from_id, ...rest }) => {
    const client = getClient();
    return await (client.whatsapp as any).sendTemplate({
      recipients: recipients.join(","),
      from_id: resolveFromId(from_id),
      ...rest,
    });
  },
};
