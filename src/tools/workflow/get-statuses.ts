// src/tools/workflow/get-statuses.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  action: z.enum(["open", "hold", "closed"]).optional(),
  phone: z.string().optional(),
  agent_id: z.number().int().positive().optional(),
  dates: z.string().optional().describe("Rango de fechas; formato YYYY-MM-DD,YYYY-MM-DD"),
  per_page: z.number().int().positive().max(200).optional(),
  page: z.number().int().positive().optional(),
});

export const getWorkflowStatusesTool: ToolDefinition<typeof schema> = {
  name: "get_workflow_statuses",
  description: "Lista los cambios de estado de conversaciones (workflow) con filtros opcionales por estado, teléfono, agente y rango de fechas.",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await (client.workflow as any).getStatuses(args);
  },
};
