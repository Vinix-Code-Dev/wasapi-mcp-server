import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { CONTACT_IDENTIFIER_DESCRIPTION } from "../../lib/recipient.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  wa_id: z.string().min(1).describe(CONTACT_IDENTIFIER_DESCRIPTION),
});

export const getContactTool: ToolDefinition<typeof schema> = {
  name: "get_contact",
  description:
    "Obtiene un contacto por cualquiera de sus identificadores: teléfono, uuid, BSUID o " +
    "username de WhatsApp. La respuesta incluye bsuid y wa_username, que son los únicos " +
    "identificadores de un contacto que oculta su número (su phone llega en null).",
  schema,
  handler: async ({ wa_id }) => {
    const client = getClient();
    return await (client.contacts as any).getById(wa_id);
  },
};
