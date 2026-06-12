import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const contactCard = z.object({
  name: z.object({
    formatted_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    middle_name: z.string().optional(),
    suffix: z.string().optional(),
    prefix: z.string().optional(),
  }),
  birthday: z.string().optional(),
  phones: z.array(z.object({ phone: z.string(), type: z.string(), wa_id: z.string().optional() })).optional(),
  emails: z.array(z.object({ email: z.string(), type: z.string() })).optional(),
  org: z.object({ company: z.string(), department: z.string(), title: z.string() }).optional(),
  urls: z.array(z.object({ url: z.string(), type: z.string() })).optional(),
  addresses: z
    .array(
      z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
        country: z.string(),
        country_code: z.string(),
        type: z.string(),
      }),
    )
    .optional(),
});

const schema = z.object({
  wa_id: z.string().min(1),
  contacts: z.array(contactCard).min(1),
  from_id: z.number().int().positive().optional(),
  context_wam_id: z.string().optional(),
});

export const sendContactCardTool: ToolDefinition<typeof schema> = {
  name: "send_contact_card",
  description: "Envía una o más tarjetas de contacto (vCard) por WhatsApp a un destinatario.",
  schema,
  handler: async ({ wa_id, contacts, from_id, context_wam_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await (client.whatsapp as any).sendContacts({ wa_id, from_id: resolved, context_wam_id, contacts });
  },
};
