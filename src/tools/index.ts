import type { ToolDefinition } from "../lib/register-tool.js";
import { listContactsTool } from "./contacts/list.js";
import { getContactTool } from "./contacts/get.js";
import { createContactTool } from "./contacts/create.js";
import { updateContactTool } from "./contacts/update.js";
import { deleteContactTool } from "./contacts/delete.js";

export const allTools: ToolDefinition[] = [
  listContactsTool,
  getContactTool,
  createContactTool,
  updateContactTool,
  deleteContactTool,
];
