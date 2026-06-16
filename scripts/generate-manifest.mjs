// scripts/generate-manifest.mjs
import { z } from "zod";

const TOOLS = [
  { name: "list_contacts", description: "Lista contactos (paginada, con búsqueda opcional)" },
  { name: "get_contact", description: "Obtiene un contacto por su wa_id" },
  { name: "create_contact", description: "Crea un contacto nuevo" },
  { name: "update_contact", description: "Actualiza un contacto existente" },
  { name: "delete_contact", description: "Elimina un contacto" },
  { name: "add_label_to_contact", description: "Agrega una etiqueta a un contacto" },
  { name: "remove_label_from_contact", description: "Quita una etiqueta de un contacto" },
  { name: "list_whatsapp_numbers", description: "Lista los números de WhatsApp conectados a la cuenta" },
  { name: "send_message", description: "Envía un mensaje de texto por WhatsApp" },
  { name: "send_template", description: "Envía una plantilla aprobada de WhatsApp" },
  { name: "send_attachment", description: "Envía un archivo adjunto desde una ruta local" },
  { name: "get_conversation", description: "Obtiene el hilo de mensajes con un contacto" },
  { name: "assign_agent_to_contact", description: "Asigna automáticamente un agente a un contacto" },
  { name: "export_contacts", description: "Inicia una exportación de todos los contactos" },
  { name: "list_whatsapp_templates", description: "Lista las plantillas de WhatsApp de la cuenta" },
  { name: "get_whatsapp_template", description: "Obtiene el detalle de una plantilla por UUID" },
  { name: "get_template_fields", description: "Obtiene los campos/variables de una plantilla" },
  { name: "list_templates_by_number", description: "Lista plantillas disponibles para un número" },
  { name: "sync_meta_templates", description: "Sincroniza las plantillas desde Meta" },
  { name: "change_conversation_status", description: "Cambia el estado de una conversación (open/hold/closed)" },
  { name: "send_contact_card", description: "Envía tarjetas de contacto (vCard) por WhatsApp" },
  { name: "list_flows", description: "Lista los WhatsApp Flows de la cuenta" },
  { name: "list_flows_by_number", description: "Lista los Flows disponibles para un número" },
  { name: "send_flow", description: "Envía un WhatsApp Flow interactivo a un contacto" },
  { name: "get_flow_responses", description: "Obtiene las respuestas de un Flow (paginado)" },
  { name: "get_flow_assets", description: "Obtiene el detalle y assets de un Flow" },
  { name: "get_flow_screens", description: "Lista las pantallas de un Flow" },
  { name: "list_campaigns", description: "Lista las campañas de difusión de la cuenta" },
  { name: "get_campaign", description: "Obtiene el detalle de una campaña y sus envíos" },
  { name: "list_funnels", description: "Lista los embudos de venta de la cuenta" },
  { name: "search_contact_in_funnels", description: "Busca un contacto en los embudos por teléfono o UUID" },
  { name: "move_contact_to_funnel_stage", description: "Mueve un contacto a otra etapa de un embudo" },
  { name: "get_online_agents", description: "Métrica: agentes en línea" },
  { name: "get_status_contacts", description: "Métrica: contactos por estado" },
  { name: "get_total_campaigns", description: "Métrica: total de campañas en un rango de fechas" },
  { name: "get_consolidated_conversations", description: "Métrica: conversaciones consolidadas en un rango" },
  { name: "get_agent_conversations", description: "Métrica: conversaciones por agente en un rango" },
  { name: "get_messages", description: "Métrica: volumen de mensajes en un rango" },
  { name: "get_messages_bot", description: "Métrica: mensajes del bot en un rango" },
  { name: "get_agent_time_response", description: "Métrica de agente: tiempo de respuesta" },
  { name: "get_agent_transferred", description: "Métrica de agente: conversaciones transferidas" },
  { name: "get_agent_volume_of_work", description: "Métrica de agente: volumen de trabajo" },
  { name: "get_agent_time_in_conversation", description: "Métrica de agente: tiempo en conversación" },
  { name: "toggle_bot_status", description: "Activa o desactiva el chatbot para un contacto" },
  { name: "get_workflow_statuses", description: "Lista cambios de estado de conversaciones (workflow)" },
  { name: "list_custom_fields", description: "Lista los campos personalizados de la cuenta" },
  { name: "get_custom_field", description: "Obtiene un campo personalizado por ID" },
  { name: "create_custom_field", description: "Crea un campo personalizado" },
  { name: "update_custom_field", description: "Actualiza un campo personalizado" },
  { name: "delete_custom_field", description: "Elimina un campo personalizado" },
  { name: "get_current_user", description: "Obtiene los datos del usuario de la API key actual" },
  { name: "list_conversations", description: "Lista las conversaciones de la cuenta (paginado por cursor) con filtros" },
  { name: "get_conversations_next_page", description: "Siguiente página de conversaciones usando un cursor" },
  { name: "list_labels", description: "Lista las etiquetas de la cuenta" },
  { name: "search_labels", description: "Busca etiquetas por nombre" },
  { name: "get_label", description: "Obtiene una etiqueta por ID" },
  { name: "create_label", description: "Crea una etiqueta" },
  { name: "update_label", description: "Actualiza una etiqueta" },
  { name: "delete_label", description: "Elimina una etiqueta" },
  { name: "get_agent_performance_report", description: "Reporte de desempeño por agente en un rango" },
  { name: "get_workflow_volume_report", description: "Reporte de volumen de workflow en un rango" },
  { name: "get_satisfaction_survey_report", description: "Reporte de encuestas de satisfacción en un rango" },
];

export const manifestSchema = z.object({
  manifest_version: z.literal("0.3"),
  name: z.string().min(1),
  display_name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().min(1),
  long_description: z.string().min(1),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
  homepage: z.string().url(),
  documentation: z.string().url(),
  support: z.string().url(),
  license: z.string(),
  keywords: z.array(z.string()),
  icon: z.string(),
  server: z.object({
    type: z.literal("node"),
    entry_point: z.string(),
    mcp_config: z.object({
      command: z.string(),
      args: z.array(z.string()),
      env: z.record(z.string(), z.string()),
    }),
  }),
  user_config: z.object({
    api_key: z.object({
      type: z.literal("string"),
      title: z.string(),
      description: z.string(),
      // The API key MUST be masked and keychain-stored; the schema enforces it
      // so an accidental edit to the builder fails the build, not the user.
      sensitive: z.literal(true),
      required: z.literal(true),
    }),
  }),
  tools: z.array(z.object({ name: z.string(), description: z.string() })),
  compatibility: z.object({
    claude_desktop: z.string(),
    platforms: z.array(z.string()),
    runtimes: z.record(z.string(), z.string()),
  }),
});

function repoUrlToHttps(url) {
  if (!url) return "https://github.com/Vinix-Code-Dev/wasapi-mcp-server";
  return url
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\/git@([^/]+)\//, "https://$1/")
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/\.git$/, "");
}

export function buildManifest(pkg) {
  const homepage = repoUrlToHttps(pkg.repository?.url);
  const author = typeof pkg.author === "string"
    ? { name: pkg.author }
    : (pkg.author ?? { name: "Unknown" });

  return {
    manifest_version: "0.3",
    name: "wasapi-mcp",
    display_name: "Wasapi",
    version: pkg.version,
    description: "Gestiona contactos y envía mensajes de WhatsApp desde tu cuenta de Wasapi",
    long_description:
      "Conecta Claude con tu cuenta de WhatsApp Business en Wasapi. Envía mensajes, gestiona contactos y consulta conversaciones — todo en lenguaje natural.\n\n" +
      "**Antes de instalar:** consigue tu API key en [app.wasapi.io/account/developer](https://app.wasapi.io/account/developer).\n\n" +
      "**Después de instalar:** activa la extensión en Configuración → Extensiones (se instala deshabilitada por defecto).",
    author,
    homepage,
    documentation: `${homepage}#readme`,
    support: `${homepage}/issues`,
    license: pkg.license ?? "ISC",
    keywords: ["wasapi", "whatsapp", "messaging", "crm"],
    icon: "icon.png",
    server: {
      type: "node",
      entry_point: "dist/index.js",
      mcp_config: {
        command: "node",
        args: ["${__dirname}/dist/index.js"],
        env: { WASAPI_API_KEY: "${user_config.api_key}" },
      },
    },
    user_config: {
      api_key: {
        type: "string",
        title: "Wasapi API Key",
        description: "Pega aquí tu API key de Wasapi",
        sensitive: true,
        required: true,
      },
    },
    tools: TOOLS,
    compatibility: {
      claude_desktop: ">=1.0.0",
      platforms: ["darwin", "win32", "linux"],
      runtimes: { node: ">=20.0.0" },
    },
  };
}
