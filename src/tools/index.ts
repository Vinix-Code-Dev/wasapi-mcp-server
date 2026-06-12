import type { ToolDefinition } from "../lib/register-tool.js";
import { listContactsTool } from "./contacts/list.js";
import { getContactTool } from "./contacts/get.js";
import { createContactTool } from "./contacts/create.js";
import { updateContactTool } from "./contacts/update.js";
import { deleteContactTool } from "./contacts/delete.js";
import { addLabelTool } from "./contacts/add-label.js";
import { removeLabelTool } from "./contacts/remove-label.js";
import { assignAgentTool } from "./contacts/assign-agent.js";
import { exportContactsTool } from "./contacts/export.js";
import { listWhatsappNumbersTool } from "./whatsapp/list-numbers.js";
import { sendMessageTool } from "./whatsapp/send-message.js";
import { sendTemplateTool } from "./whatsapp/send-template.js";
import { sendAttachmentTool } from "./whatsapp/send-attachment.js";
import { getConversationTool } from "./whatsapp/get-conversation.js";
import { listTemplatesTool } from "./whatsapp/list-templates.js";
import { getTemplateTool } from "./whatsapp/get-template.js";
import { getTemplateFieldsTool } from "./whatsapp/get-template-fields.js";
import { listTemplatesByNumberTool } from "./whatsapp/list-templates-by-number.js";
import { syncMetaTemplatesTool } from "./whatsapp/sync-meta-templates.js";
import { changeStatusTool } from "./whatsapp/change-status.js";
import { sendContactCardTool } from "./whatsapp/send-contact-card.js";
import { listFlowsTool } from "./whatsapp/list-flows.js";
import { listFlowsByNumberTool } from "./whatsapp/list-flows-by-number.js";
import { sendFlowTool } from "./whatsapp/send-flow.js";
import { getFlowResponsesTool } from "./whatsapp/get-flow-responses.js";
import { getFlowAssetsTool } from "./whatsapp/get-flow-assets.js";
import { getFlowScreensTool } from "./whatsapp/get-flow-screens.js";
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
  assignAgentTool,
  exportContactsTool,
  listTemplatesTool,
  getTemplateTool,
  getTemplateFieldsTool,
  listTemplatesByNumberTool,
  syncMetaTemplatesTool,
  changeStatusTool,
  sendContactCardTool,
  listFlowsTool,
  listFlowsByNumberTool,
  sendFlowTool,
  getFlowResponsesTool,
  getFlowAssetsTool,
  getFlowScreensTool,
];
