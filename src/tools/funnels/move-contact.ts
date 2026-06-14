import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  funnel_contact_id: z.number().int().positive(),
  to_stage_id: z.number().int().positive(),
});

export const moveContactToFunnelStageTool: ToolDefinition<typeof schema> = {
  name: "move_contact_to_funnel_stage",
  description: "Mueve un contacto a otra etapa de un embudo. Usa search_contact_in_funnels para obtener el funnel_contact_id y list_funnels para los IDs de etapa.",
  schema,
  handler: async ({ funnel_contact_id, to_stage_id }) => {
    const client = getClient();
    return await (client.funnels as any).moveContactToFunnel({
      funnelContactId: funnel_contact_id,
      toStageId: to_stage_id,
    });
  },
};
