// src/tools/user/list-users.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  with_session: z
    .boolean()
    .optional()
    .describe(
      "Si es true, incluye información de sesión de cada agente (si está en línea y su última actividad).",
    ),
});

export const listUsersTool: ToolDefinition<typeof schema> = {
  name: "list_users",
  description:
    "Lista todos los usuarios (agentes) de la organización: nombre, email, rol, permisos y números de WhatsApp asignados. Útil para ver el equipo o decidir a quién asignar una conversación. Requiere el permiso 'view agents' en la cuenta.",
  schema,
  handler: async (args) => {
    // El SDK no expone un módulo para /users, así que usamos el cliente HTTP
    // crudo que WasapiClient publica vía getClient() (mismo patrón `as any`
    // que get-user.ts). El endpoint vive en /users dentro del grupo v1.
    const client = getClient();
    const params = args.with_session ? { with_session: "1" } : {};
    const response = await (client.getClient() as any).get("/users", { params });
    return response.data;
  },
};
