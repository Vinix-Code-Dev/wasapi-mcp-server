import type { ToolDefinition } from "../lib/register-tool.js";
import { listContactsTool } from "./contacts/list.js";
import { getContactTool } from "./contacts/get.js";

export const allTools: ToolDefinition[] = [
  listContactsTool,
  getContactTool,
];
