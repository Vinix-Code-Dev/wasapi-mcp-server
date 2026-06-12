import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  email_urls: z.array(z.string().email()).optional(),
});

export const exportContactsTool: ToolDefinition<typeof schema> = {
  name: "export_contacts",
  description: "Inicia una exportación de todos los contactos de la cuenta. Opcionalmente recibe emails a los que enviar el archivo exportado.",
  schema,
  handler: async (args) => {
    const client = getClient();
    await (client.contacts as any).export(args);
    return { success: true, message: "Exportación de contactos iniciada" };
  },
};
