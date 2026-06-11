import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

// SDK: contacts.create({ first_name, last_name, email, country_code, phone, ...options })
// first_name is required per sdk-surface.md
const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  country_code: z.string().optional(),
  email: z.string().email().optional(),
});

export const createContactTool: ToolDefinition<typeof schema> = {
  name: "create_contact",
  description: "Crea un nuevo contacto en Wasapi. first_name es requerido. Incluir phone y country_code para enviar mensajes.",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await (client.contacts as any).create(args);
  },
};
