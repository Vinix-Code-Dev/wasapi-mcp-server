import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const syncMetaTemplatesTool: ToolDefinition<typeof schema> = {
  name: "sync_meta_templates",
  description: "Sincroniza las plantillas desde Meta hacia Wasapi. Puede tardar; úsalo cuando creaste o editaste plantillas en Meta Business.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.whatsapp as any).syncMetaTemplates();
  },
};
