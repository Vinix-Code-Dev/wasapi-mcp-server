import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  start_date: z.string().min(1).describe("Fecha inicial, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final, formato YYYY-MM-DD"),
  agent_id: z.number().int().positive().optional().describe("Filtra por agente; si se omite, cubre todos"),
});

export const getAgentPerformanceReportTool: ToolDefinition<typeof schema> = {
  name: "get_agent_performance_report",
  description: "Reporte de desempeño por agente en un rango de fechas. agent_id es un filtro opcional.",
  schema,
  handler: async ({ start_date, end_date, agent_id }) => {
    const client = getClient();
    return await (client.reports as any).getPerformanceByAgent({ start_date, end_date, agent_id });
  },
};
