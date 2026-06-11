import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

// SDK: whatsapp.sendTemplate({ recipients, template_id, contact_type, from_id? })
// NOTE: The plan originally assumed template_name + variables but the SDK uses
// template_id (UUID) + recipients (array) + contact_type. The 'variables' field
// from the plan is NOT present in the SDK shape per sdk-surface.md.
const schema = z.object({
  recipients: z.array(z.string().min(1)).min(1).describe("Lista de wa_id de destinatarios (E.164 sin +)"),
  template_id: z.string().min(1).describe("UUID del template a enviar (obtenible desde la consola Wasapi)"),
  contact_type: z.string().min(1).describe("Tipo de contacto, e.g. 'individual' o 'group'"),
  from_id: z.number().int().positive().optional().describe("WhatsApp number ID to send from. Falls back to WASAPI_FROM_ID env var."),
});

export const sendTemplateTool: ToolDefinition<typeof schema> = {
  name: "send_template",
  description: [
    "Envía una plantilla (template) de WhatsApp a uno o más destinatarios.",
    "Usa template_id (UUID) — no template_name. El campo 'variables' del plan original no existe en el SDK.",
    "from_id es opcional si WASAPI_FROM_ID está configurado.",
  ].join(" "),
  schema,
  handler: async ({ recipients, template_id, contact_type, from_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await (client.whatsapp as any).sendTemplate({
      recipients,
      template_id,
      contact_type,
      from_id: resolved,
    });
  },
};
