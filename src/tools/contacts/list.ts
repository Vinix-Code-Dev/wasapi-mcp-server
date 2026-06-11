import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  page: z.number().int().positive().optional(),
  search: z.string().optional(),
  labels: z.array(z.number().int().positive()).optional(),
});

export const listContactsTool: ToolDefinition<typeof schema> = {
  name: "list_contacts",
  description: "Lista paginada de contactos de la cuenta Wasapi. Soporta búsqueda por texto o filtro por labels.",
  schema,
  handler: async (args) => {
    const client = getClient();
    // Build args object, only include defined fields
    const params: Record<string, unknown> = {};
    if (args.page !== undefined) params.page = args.page;
    if (args.search !== undefined) params.search = args.search;
    if (args.labels !== undefined) params.labels = args.labels;
    return await (client.contacts as any).getSearch(params);
  },
};
