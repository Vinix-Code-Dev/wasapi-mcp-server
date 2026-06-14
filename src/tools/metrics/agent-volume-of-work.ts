import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  agent_id: z.number().int().positive(),
  start_date: z.string().min(1).describe("Fecha inicial, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final, formato YYYY-MM-DD"),
});

export const getAgentVolumeOfWorkTool: ToolDefinition<typeof schema> = {
  name: "get_agent_volume_of_work",
  description: "Métrica de un agente: volumen de trabajo en un rango de fechas.",
  schema,
  handler: async ({ agent_id, start_date, end_date }) => {
    const client = getClient();
    return await (client.metrics as any).getAgentVolumeOfWork({
      agentId: agent_id,
      startDate: start_date,
      endDate: end_date,
    });
  },
};
