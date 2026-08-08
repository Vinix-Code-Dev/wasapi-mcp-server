import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { wrapHandler, type ToolDefinition } from "./lib/register-tool.js";
import { getAnnotations } from "./lib/tool-annotations.js";

// Report the real package version in the MCP handshake (kept in sync with
// package.json / the manifest — directory reviewers check this consistency).
function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    return JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// Exported so it can be unit-tested directly (pure transform).
export function buildToolList(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.schema) as any,
    annotations: getAnnotations(t.name),
  }));
}

// Server-level guidance shown to the client model. Documents the campaign flow so
// the model gathers the right data and, crucially, ASKS the user how to target
// recipients before sending.
const SERVER_INSTRUCTIONS = `Servidor MCP de Wasapi (WhatsApp Business).

Flujo para CREAR Y ENVIAR una campaña (create_campaign):
1. Elige la línea con list_whatsapp_numbers — usa su "id" como phone_id (prefiere líneas con can_send_message: AVAILABLE).
2. Elige la plantilla de esa línea con list_templates_by_number y consulta sus variables con get_template_fields.
3. PREGUNTA SIEMPRE al usuario cómo definir los destinatarios: por labels, contact_ids, phones o all. Según su respuesta, reúne los IDs con list_labels/search_labels (etiquetas) o list_contacts (contactos/teléfonos).
4. Arma "variables" según la plantilla (body/header/buttons) y "media" si la plantilla lleva header multimedia.
5. Llama create_campaign primero con confirm=false para PREVISUALIZAR; muestra el resumen al usuario; luego con confirm=true para enviar de verdad. Crear una campaña envía mensajes reales e irreversibles.
6. Tras enviar, monitorea con get_campaign_stats y get_campaign_logs. Puedes cancelar una campaña programada con cancel_campaign.

Contactos que ocultan su número de teléfono:
WhatsApp permite ocultar el número. Esos contactos llegan con phone en null y se identifican con bsuid (formato XX.alfanumérico) y, casi siempre, con wa_username.
- El campo wa_id de los tools de envío y de conversación acepta las tres formas —teléfono, bsuid o username— y Wasapi detecta cuál es por su formato. No intentes convertir un bsuid ni un username a teléfono: no se puede, y no hace falta.
- Si phone viene en null, NO es un error ni un dato que haya que pedirle al usuario: usa bsuid o wa_username para operar, y muestra wa_username cuando tengas que nombrar al contacto ante una persona.
- En send_template, omite contact_type para que cada destinatario se resuelva por su formato.
- A un contacto de número oculto no se le puede ESCRIBIR PRIMERO: sin teléfono no hay a quién iniciarle conversación, así que solo puedes responderle si él escribió antes. Si el usuario te pide iniciar una, explícale esto en vez de inventar un número.
- wa_username es mutable: sirve para encontrar y para mostrar, nunca para guardar como identidad. Para eso usa el uuid del contacto.`;

export function buildServer(tools: ToolDefinition[]): Server {
  const server = new Server(
    { name: "wasapi-mcp", version: packageVersion() },
    { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
  );

  const handlers = new Map(tools.map((t) => [t.name, wrapHandler(t.schema, t.handler)]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: buildToolList(tools),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const fn = handlers.get(req.params.name);
    if (!fn) {
      return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
    }
    return fn(req.params.arguments ?? {});
  });

  return server;
}
