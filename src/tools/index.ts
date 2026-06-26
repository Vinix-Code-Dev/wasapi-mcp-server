import type { ToolDefinition } from "../lib/register-tool.js";
import { listContactsTool } from "./contacts/list.js";
import { getContactTool } from "./contacts/get.js";
import { createContactTool } from "./contacts/create.js";
import { updateContactTool } from "./contacts/update.js";
import { deleteContactTool } from "./contacts/delete.js";
import { addLabelTool } from "./contacts/add-label.js";
import { removeLabelTool } from "./contacts/remove-label.js";
import { assignAgentTool } from "./contacts/assign-agent.js";
// import { exportContactsTool } from "./contacts/export.js";   // disabled
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
// import { listFlowsTool } from "./whatsapp/list-flows.js";              // disabled
// import { listFlowsByNumberTool } from "./whatsapp/list-flows-by-number.js"; // disabled
// import { sendFlowTool } from "./whatsapp/send-flow.js";                // disabled
// import { getFlowResponsesTool } from "./whatsapp/get-flow-responses.js"; // disabled
// import { getFlowAssetsTool } from "./whatsapp/get-flow-assets.js";     // disabled
// import { getFlowScreensTool } from "./whatsapp/get-flow-screens.js";   // disabled
import { listCampaignsTool } from "./campaigns/list.js";
import { getCampaignTool } from "./campaigns/get.js";
import { listFunnelsTool } from "./funnels/list.js";
import { searchContactInFunnelsTool } from "./funnels/search-contact.js";
import { moveContactToFunnelStageTool } from "./funnels/move-contact.js";
import { getOnlineAgentsTool } from "./metrics/online-agents.js";
import { getStatusContactsTool } from "./metrics/status-contacts.js";
import { getTotalCampaignsTool } from "./metrics/total-campaigns.js";
import { getConsolidatedConversationsTool } from "./metrics/consolidated-conversations.js";
import { getAgentConversationsTool } from "./metrics/agent-conversations.js";
import { getMessagesTool } from "./metrics/messages.js";
import { getMessagesBotTool } from "./metrics/messages-bot.js";
import { getAgentTimeResponseTool } from "./metrics/agent-time-response.js";
import { getAgentTransferredTool } from "./metrics/agent-transferred.js";
import { getAgentVolumeOfWorkTool } from "./metrics/agent-volume-of-work.js";
import { getAgentTimeInConversationTool } from "./metrics/agent-time-in-conversation.js";
import { toggleBotStatusTool } from "./bot/toggle-status.js";
import { getWorkflowStatusesTool } from "./workflow/get-statuses.js";
import { listCustomFieldsTool } from "./custom-fields/list.js";
import { getCustomFieldTool } from "./custom-fields/get.js";
import { createCustomFieldTool } from "./custom-fields/create.js";
import { updateCustomFieldTool } from "./custom-fields/update.js";
import { deleteCustomFieldTool } from "./custom-fields/delete.js";
import { getCurrentUserTool } from "./user/get-user.js";
import { listConversationsTool } from "./conversations/list.js";
import { getConversationsNextPageTool } from "./conversations/next-page.js";
import { listLabelsTool } from "./labels/list.js";
import { searchLabelsTool } from "./labels/search.js";
import { getLabelTool } from "./labels/get.js";
import { createLabelTool } from "./labels/create.js";
import { updateLabelTool } from "./labels/update.js";
import { deleteLabelTool } from "./labels/delete.js";
import { getAgentPerformanceReportTool } from "./reports/agent-performance.js";
import { getWorkflowVolumeReportTool } from "./reports/workflow-volume.js";
import { getSatisfactionSurveyReportTool } from "./reports/satisfaction-survey.js";
// NOTE: campaigns create/update/delete are NOT implemented — SDK stubs that throw.
// Tracked for follow-up SDK PRs.

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
  // exportContactsTool,        // disabled
  listTemplatesTool,
  getTemplateTool,
  getTemplateFieldsTool,
  listTemplatesByNumberTool,
  syncMetaTemplatesTool,
  changeStatusTool,
  sendContactCardTool,
  // listFlowsTool,             // disabled
  // listFlowsByNumberTool,     // disabled
  // sendFlowTool,              // disabled
  // getFlowResponsesTool,      // disabled
  // getFlowAssetsTool,         // disabled
  // getFlowScreensTool,        // disabled
  listCampaignsTool,
  getCampaignTool,
  listFunnelsTool,
  searchContactInFunnelsTool,
  moveContactToFunnelStageTool,
  getOnlineAgentsTool,
  getStatusContactsTool,
  getTotalCampaignsTool,
  getConsolidatedConversationsTool,
  getAgentConversationsTool,
  getMessagesTool,
  getMessagesBotTool,
  getAgentTimeResponseTool,
  getAgentTransferredTool,
  getAgentVolumeOfWorkTool,
  getAgentTimeInConversationTool,
  toggleBotStatusTool,
  getWorkflowStatusesTool,
  listCustomFieldsTool,
  getCustomFieldTool,
  createCustomFieldTool,
  updateCustomFieldTool,
  deleteCustomFieldTool,
  getCurrentUserTool,
  listConversationsTool,
  getConversationsNextPageTool,
  listLabelsTool,
  searchLabelsTool,
  getLabelTool,
  createLabelTool,
  updateLabelTool,
  deleteLabelTool,
  getAgentPerformanceReportTool,
  getWorkflowVolumeReportTool,
  getSatisfactionSurveyReportTool,
];
