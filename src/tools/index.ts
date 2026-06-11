import type { ToolDefinition } from "../lib/register-tool.js";
import { listContactsTool } from "./contacts/list.js";

export const allTools: ToolDefinition[] = [
  listContactsTool,
];
