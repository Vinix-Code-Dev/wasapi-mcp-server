import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z
  .object({
    phone_number: z.string().min(1).optional(),
    contact_uuid: z.string().min(1).optional(),
  })
  .refine((v) => v.phone_number || v.contact_uuid, {
    message: "Debes indicar phone_number o contact_uuid",
  });

export const searchContactInFunnelsTool: ToolDefinition<typeof schema> = {
  name: "search_contact_in_funnels",
  description: "Busca un contacto dentro de los embudos por número de teléfono o por contact_uuid. Devuelve en qué embudo y etapa está.",
  schema,
  handler: async ({ phone_number, contact_uuid }) => {
    const client = getClient();
    return await (client.funnels as any).searchContact({
      phoneNumber: phone_number,
      contactUuid: contact_uuid,
    });
  },
};
