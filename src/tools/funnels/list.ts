import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listFunnelsTool: ToolDefinition<typeof schema> = {
  name: "list_funnels",
  description: "Lista todos los embudos (funnels) de venta de la cuenta Wasapi, con sus etapas.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.funnels as any).getAll();
  },
};
