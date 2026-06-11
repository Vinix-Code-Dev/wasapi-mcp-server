import type { ToolDefinition } from "../lib/register-tool.js";
import { listContactsTool } from "./contacts/list.js";
import { getContactTool } from "./contacts/get.js";
import { createContactTool } from "./contacts/create.js";
import { updateContactTool } from "./contacts/update.js";
import { deleteContactTool } from "./contacts/delete.js";
import { addLabelTool } from "./contacts/add-label.js";
import { removeLabelTool } from "./contacts/remove-label.js";
import { listWhatsappNumbersTool } from "./whatsapp/list-numbers.js";
import { sendMessageTool } from "./whatsapp/send-message.js";
import { sendTemplateTool } from "./whatsapp/send-template.js";
import { sendAttachmentTool } from "./whatsapp/send-attachment.js";
import { getConversationTool } from "./whatsapp/get-conversation.js";
// NOTE: list_conversations is NOT implemented — SDK gap (no listConversations method exists).
// Tracked for follow-up SDK PR.

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
  sendMessageTool,
  sendTemplateTool,
  sendAttachmentTool,
  getConversationTool,
];
