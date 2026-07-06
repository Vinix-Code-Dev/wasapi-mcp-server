import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { createCampaign, type CreateCampaignPayload } from "../../lib/campaigns-api.js";

const schema = z
  .object({
    name: z.string().min(1).max(255).describe("Nombre descriptivo de la campaña"),
    description: z.string().optional(),
    template_uuid: z
      .string()
      .uuid()
      .describe("UUID de la plantilla aprobada (de list_templates_by_number)"),
    phone_id: z
      .number()
      .int()
      .positive()
      .describe("ID de la línea de WhatsApp (el 'id' de list_whatsapp_numbers)"),
    recipients: z
      .object({
        type: z
          .enum(["phones", "contact_ids", "labels", "all"])
          .describe("Cómo se seleccionan los destinatarios"),
        values: z
          .array(z.union([z.string(), z.number()]))
          .optional()
          .describe("Teléfonos, IDs de contactos o IDs de etiquetas según 'type'. Omitir si type=all"),
      })
      .describe("Destinatarios: PREGUNTA al usuario si quiere usar labels, contact_ids, phones o all"),
    variables: z
      .object({
        body: z.array(z.string()).optional().describe("Valores para {{1}}, {{2}}, ... del cuerpo"),
        header: z.string().optional().describe("Valor de la variable del header de texto"),
        buttons: z.array(z.string()).optional().describe("Valores dinámicos de botones CTA"),
      })
      .optional(),
    media: z
      .object({
        type: z.enum(["image", "video", "document"]),
        url: z.string().url().describe("URL del archivo (header multimedia de la plantilla)"),
        filename: z.string().optional(),
      })
      .optional(),
    scheduled_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, "Formato requerido: 'YYYY-MM-DD HH:mm'")
      .optional()
      .describe("Fecha/hora futura en la TZ del usuario. Omitir para envío inmediato"),
    conversation_status: z.enum(["unchanged", "open", "closed", "hold"]).optional(),
    disable_chatbot: z.boolean().optional(),
    confirm: z
      .boolean()
      .describe("OBLIGATORIO. Debe ser true para enviar de verdad. Con false devuelve una previsualización sin enviar"),
  })
  .refine(
    (v) => v.recipients.type === "all" || (v.recipients.values?.length ?? 0) > 0,
    { message: "recipients.values es requerido salvo cuando type=all", path: ["recipients", "values"] },
  );

export const createCampaignTool: ToolDefinition<typeof schema> = {
  name: "create_campaign",
  description:
    "Crea y ENVÍA una campaña de difusión de WhatsApp con una plantilla aprobada. " +
    "IMPORTANTE: envía mensajes reales (irreversible). Flujo recomendado: 1) elegir línea con list_whatsapp_numbers; " +
    "2) elegir plantilla con list_templates_by_number y ver variables con get_template_fields; " +
    "3) PREGUNTAR al usuario cómo definir destinatarios (labels / contact_ids / phones / all) y reunir los IDs con list_labels o list_contacts; " +
    "4) llamar primero con confirm=false para previsualizar, mostrar el resumen al usuario, y luego con confirm=true para enviar. " +
    "Sin confirm=true NO se envía nada.",
  schema,
  handler: async (args) => {
    const { confirm, ...campaign } = args;

    if (confirm !== true) {
      const values = campaign.recipients.values ?? [];
      return {
        preview: true,
        would_send: campaign,
        recipients_summary: {
          type: campaign.recipients.type,
          count:
            campaign.recipients.type === "all"
              ? "todos los contactos activos"
              : values.length,
        },
        message:
          "Previsualización — no se envió nada. Revisa los datos y vuelve a llamar con confirm=true para enviar. " +
          "El total real de destinatarios (matched) se calcula al confirmar.",
      };
    }

    return await createCampaign(campaign as CreateCampaignPayload);
  },
};
