import type { ToolDefinition } from "../lib/register-tool.js";
import { listContactsTool } from "./contacts/list.js";
import { getContactTool } from "./contacts/get.js";
import { createContactTool } from "./contacts/create.js";
import { updateContactTool } from "./contacts/update.js";
import { deleteContactTool } from "./contacts/delete.js";
import { addLabelTool } from "./contacts/add-label.js";
import { removeLabelTool } from "./contacts/remove-label.js";
import { listWhatsappNumbersTool } from "./whatsapp/list-numbers.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const allTools: ToolDefinition<any>[] = [
  listContactsTool,
  getContactTool,
  createContactTool,
  updateContactTool,
  deleteContactTool,
  addLabelTool,
  removeLabelTool,
  listWhatsappNumbersTool,
];
