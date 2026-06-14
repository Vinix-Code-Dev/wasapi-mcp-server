// src/tools/user/get-user.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const getCurrentUserTool: ToolDefinition<typeof schema> = {
  name: "get_current_user",
  description: "Obtiene los datos de la cuenta/usuario asociado a la API key actual.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.user as any).getUser();
  },
};
