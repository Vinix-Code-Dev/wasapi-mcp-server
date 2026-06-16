// src/lib/tool-annotations.ts
// Single source of truth for MCP tool annotations required by the Claude
// Connectors Directory: each tool needs a human-readable title and either
// readOnlyHint (pure reads) or destructiveHint (writes/side effects).

export interface ToolAnnotationSource {
  title: string;
  readOnly: boolean;
}

export interface McpToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint?: true;
}

const R = (title: string): ToolAnnotationSource => ({ title, readOnly: true });
const W = (title: string): ToolAnnotationSource => ({ title, readOnly: false });

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotationSource> = {
  // Contacts
  list_contacts: R("Listar contactos"),
  get_contact: R("Ver contacto"),
  create_contact: W("Crear contacto"),
  update_contact: W("Actualizar contacto"),
  delete_contact: W("Eliminar contacto"),
  add_label_to_contact: W("Agregar etiqueta a contacto"),
  remove_label_from_contact: W("Quitar etiqueta de contacto"),
  assign_agent_to_contact: W("Asignar agente a contacto"),
  export_contacts: W("Exportar contactos"),
  // WhatsApp — mensajería y conversaciones
  list_whatsapp_numbers: R("Listar números de WhatsApp"),
  send_message: W("Enviar mensaje"),
  send_template: W("Enviar plantilla"),
  send_attachment: W("Enviar adjunto"),
  get_conversation: R("Ver conversación"),
  send_contact_card: W("Enviar tarjeta de contacto"),
  change_conversation_status: W("Cambiar estado de conversación"),
  // WhatsApp — plantillas
  list_whatsapp_templates: R("Listar plantillas"),
  get_whatsapp_template: R("Ver plantilla"),
  get_template_fields: R("Ver campos de plantilla"),
  list_templates_by_number: R("Listar plantillas por número"),
  sync_meta_templates: W("Sincronizar plantillas con Meta"),
  // WhatsApp — flows
  list_flows: R("Listar flows"),
  list_flows_by_number: R("Listar flows por número"),
  send_flow: W("Enviar flow"),
  get_flow_responses: R("Ver respuestas de flow"),
  get_flow_assets: R("Ver assets de flow"),
  get_flow_screens: R("Ver pantallas de flow"),
  // Campaigns
  list_campaigns: R("Listar campañas"),
  get_campaign: R("Ver campaña"),
  // Funnels
  list_funnels: R("Listar embudos"),
  search_contact_in_funnels: R("Buscar contacto en embudos"),
  move_contact_to_funnel_stage: W("Mover contacto de etapa"),
  // Metrics
  get_online_agents: R("Ver agentes en línea"),
  get_status_contacts: R("Ver contactos por estado"),
  get_total_campaigns: R("Ver total de campañas"),
  get_consolidated_conversations: R("Ver conversaciones consolidadas"),
  get_agent_conversations: R("Ver conversaciones por agente"),
  get_messages: R("Ver volumen de mensajes"),
  get_messages_bot: R("Ver mensajes del bot"),
  get_agent_time_response: R("Ver tiempo de respuesta del agente"),
  get_agent_transferred: R("Ver transferencias del agente"),
  get_agent_volume_of_work: R("Ver volumen de trabajo del agente"),
  get_agent_time_in_conversation: R("Ver tiempo en conversación del agente"),
  // Bot
  toggle_bot_status: W("Activar/desactivar bot"),
  // Workflow
  get_workflow_statuses: R("Ver estados de workflow"),
  // Custom fields
  list_custom_fields: R("Listar campos personalizados"),
  get_custom_field: R("Ver campo personalizado"),
  create_custom_field: W("Crear campo personalizado"),
  update_custom_field: W("Actualizar campo personalizado"),
  delete_custom_field: W("Eliminar campo personalizado"),
  // User
  get_current_user: R("Ver usuario actual"),
  // Conversations
  list_conversations: R("Listar conversaciones"),
  get_conversations_next_page: R("Siguiente página de conversaciones"),
  // Labels
  list_labels: R("Listar etiquetas"),
  search_labels: R("Buscar etiquetas"),
  get_label: R("Ver etiqueta"),
  create_label: W("Crear etiqueta"),
  update_label: W("Actualizar etiqueta"),
  delete_label: W("Eliminar etiqueta"),
  // Reports
  get_agent_performance_report: R("Reporte de desempeño por agente"),
  get_workflow_volume_report: R("Reporte de volumen de workflow"),
  get_satisfaction_survey_report: R("Reporte de satisfacción"),
};

export function getAnnotations(name: string): McpToolAnnotations {
  const src = TOOL_ANNOTATIONS[name] ?? { title: name, readOnly: false };
  return src.readOnly
    ? { title: src.title, readOnlyHint: true }
    : { title: src.title, readOnlyHint: false, destructiveHint: true };
}
