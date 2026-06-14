// src/tools/bot/toggle-status.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  wa_id: z.string().min(1),
  action: z.enum(["enable", "disable", "disable_permanently"]),
  from_id: z.number().int().positive().optional(),
});

export const toggleBotStatusTool: ToolDefinition<typeof schema> = {
  name: "toggle_bot_status",
  description: "Activa o desactiva el chatbot para un contacto. action: 'enable' lo activa, 'disable' lo desactiva temporalmente, 'disable_permanently' lo desactiva de forma permanente. from_id es opcional si WASAPI_FROM_ID está configurado.",
  schema,
  handler: async ({ wa_id, action, from_id }) => {
    const client = getClient();
    return await (client.bot as any).toggleStatus({
      wa_id,
      data: { from_id: resolveFromId(from_id), action },
    });
  },
};
