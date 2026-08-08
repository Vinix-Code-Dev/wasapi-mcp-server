import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

// SDK: contacts.create({ first_name, last_name, email, country_code, phone, ...options })
// first_name is required per sdk-surface.md
// `bsuid` viaja por el spread de options del SDK y da de alta a un contacto de número oculto.
const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  phone: z.string().optional().describe("Teléfono en E.164 sin + (p. ej. 573001234567)."),
  bsuid: z
    .string()
    .optional()
    .describe(
      "BSUID de un contacto que oculta su número (p. ej. CO.1234567890123456). " +
        "Alternativa a phone: hay que enviar uno de los dos. Solo se acepta al CREAR — " +
        "no se puede cambiar después, porque es la clave de su conversación.",
    ),
  country_code: z.string().optional(),
  email: z.string().email().optional(),
});

export const createContactTool: ToolDefinition<typeof schema> = {
  name: "create_contact",
  description:
    "Crea un nuevo contacto en Wasapi. first_name es requerido, y además hay que enviar " +
    "phone (con country_code) o bsuid: un contacto sin ninguno de los dos no existe para el " +
    "chat ni para los envíos.",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await (client.contacts as any).create(args);
  },
};
