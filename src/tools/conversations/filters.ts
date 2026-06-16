import { z } from "zod";

// All optional filters shared by list_conversations and get_conversations_next_page.
export const conversationFilters = {
  query: z.string().optional(),
  search_type: z.enum(["contactName", "all"]).optional(),
  status: z.enum(["open", "hold", "closed"]).optional(),
  phones: z.string().optional().describe("IDs/teléfonos separados por coma"),
  labels: z.string().optional().describe("IDs de etiquetas separados por coma"),
  agents: z.string().optional().describe("IDs de agentes separados por coma"),
  dates: z.string().optional().describe("Rango de fechas YYYY-MM-DD,YYYY-MM-DD"),
  without_labels: z.boolean().optional(),
  open_options: z.enum(["0", "1", "2", "3"]).optional(),
  order_conversations: z.enum(["0", "1"]).optional(),
  all_agents: z.boolean().optional(),
  per_page: z.number().int().positive().max(200).optional(),
} as const;
