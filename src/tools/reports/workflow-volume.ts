import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  start_date: z.string().min(1).describe("Fecha inicial, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final, formato YYYY-MM-DD"),
  from_id: z.number().int().positive().optional().describe("Filtra por número de WhatsApp; si se omite, cubre todos"),
});

export const getWorkflowVolumeReportTool: ToolDefinition<typeof schema> = {
  name: "get_workflow_volume_report",
  description: "Reporte de volumen de workflow en un rango de fechas. from_id es un filtro opcional por número.",
  schema,
  handler: async ({ start_date, end_date, from_id }) => {
    const client = getClient();
    return await (client.reports as any).getVolumeOfWorkflow({ start_date, end_date, from_id });
  },
};
