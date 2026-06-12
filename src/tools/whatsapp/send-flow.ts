import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  wa_id: z.string().min(1),
  message: z.string().min(1),
  cta: z.string().min(1).describe("Texto del botón que abre el flow"),
  screen: z.string().min(1).describe("Pantalla inicial del flow (p.ej. WELCOME)"),
  flow_id: z.string().min(1),
  phone_id: z.number().int().positive().optional(),
  action: z.enum(["navigate", "data_exchange"]).optional(),
});

export const sendFlowTool: ToolDefinition<typeof schema> = {
  name: "send_flow",
  description: "Envía un WhatsApp Flow interactivo a un contacto. Usa list_flows para descubrir flow_id y get_flow_screens para las pantallas.",
  schema,
  handler: async ({ phone_id, ...rest }) => {
    const client = getClient();
    return await (client.whatsapp as any).sendFlow({ ...rest, phone_id: resolveFromId(phone_id) });
  },
};
