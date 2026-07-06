import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getCampaignLogs } from "../../lib/campaigns-api.js";

const schema = z.object({
  campaign_uuid: z.string().min(1).describe("UUID de la campaña"),
  cursor: z
    .string()
    .optional()
    .describe("Cursor de paginación (pagination.next_cursor de una respuesta previa)"),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Registros por página (1-100, por defecto 50)"),
});

export const getCampaignLogsTool: ToolDefinition<typeof schema> = {
  name: "get_campaign_logs",
  description:
    "Obtiene el detalle de entrega por contacto de una campaña (estado por destinatario), con paginación por cursor. Usa el cursor de la respuesta para avanzar de página.",
  schema,
  handler: async ({ campaign_uuid, cursor, per_page }) => {
    return await getCampaignLogs(campaign_uuid, cursor, per_page);
  },
};
