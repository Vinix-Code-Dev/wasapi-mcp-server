# Preparar para el Connectors Directory de Anthropic — Design Spec

**Date:** 2026-06-16
**Status:** Approved (brainstorming phase)
**Owner:** juanpablo@wasapi.io · versión objetivo: **v1.1.0**

## 1. Propósito

Dejar `@wasapi/mcp-server` listo para enviarlo al **Connectors Directory** de Claude (desktop extensions / MCPB). Ser aceptado quita el aviso de "desarrollador no verificado" y permite instalación habilitada por defecto.

Submission form (verificado): **https://clau.de/desktop-extention-submission**

## 2. Gap analysis (qué exige el directorio vs qué tenemos)

| Requisito | Estado | Acción v1.1.0 |
|---|---|---|
| Anotaciones en TODAS las tools: `title` + (`readOnlyHint` o `destructiveHint`). **Hard gate.** | ❌ falta | Agregar `annotations` en la respuesta `tools/list` del server |
| Privacy Policy: sección en README + `privacy_policies` (array de URLs HTTPS) en manifest. **Hard gate.** | ❌ falta | Agregar ambos |
| Tools granulares (no catch-all read+write) | ✅ 62 tools específicas | — |
| Descripciones factuales (no promocionales / sin instrucciones al modelo) | ✅ | — |
| Docs: setup, auth, ≥3 prompts de ejemplo, limitaciones, soporte | ✅ README ya los tiene | Verificar/pulir |
| Soporte (canal de contacto) | ✅ `support` → GitHub issues en manifest | — |

## 3. Anotaciones de tools

El array `tools` del manifest MCPB **solo admite name/description** (confirmado en MANIFEST.md v0.3). Por lo tanto las anotaciones van en el objeto `Tool` de la respuesta **`tools/list`** del server MCP, en el campo `annotations`:

- Lectura: `annotations: { title, readOnlyHint: true }`
- Escritura: `annotations: { title, readOnlyHint: false, destructiveHint: true }`

### Implementación: mapa centralizado + test de completitud

- Nuevo `src/lib/tool-annotations.ts`: `Record<toolName, { title: string; readOnly: boolean }>` con las 62 entradas (título en español, conciso) + `getAnnotations(name)` que devuelve la entrada o, si falta, **default conservador `destructive`** (nunca marca read-only por error).
- `src/server.ts`: en el handler de `ListToolsRequestSchema`, adjuntar `annotations` construidas desde el mapa.
- Test: aserta que **toda** tool en `allTools` tiene entrada en el mapa (falla el build si se agrega una tool sin anotación → previene drift).

Razón del mapa centralizado (vs editar 62 archivos): una sola fuente auditable de la clasificación read/write, fácil de revisar para el reviewer y para nosotros, con garantía de completitud por test.

### Clasificación (40 lectura / 22 escritura)

**readOnlyHint (40):** list_contacts, get_contact, list_whatsapp_numbers, get_conversation, list_whatsapp_templates, get_whatsapp_template, get_template_fields, list_templates_by_number, list_flows, list_flows_by_number, get_flow_responses, get_flow_assets, get_flow_screens, list_campaigns, get_campaign, list_funnels, search_contact_in_funnels, get_online_agents, get_status_contacts, get_total_campaigns, get_consolidated_conversations, get_agent_conversations, get_messages, get_messages_bot, get_agent_time_response, get_agent_transferred, get_agent_volume_of_work, get_agent_time_in_conversation, get_workflow_statuses, list_custom_fields, get_custom_field, get_current_user, list_conversations, get_conversations_next_page, list_labels, search_labels, get_label, get_agent_performance_report, get_workflow_volume_report, get_satisfaction_survey_report.

**destructiveHint (22):** create_contact, update_contact, delete_contact, add_label_to_contact, remove_label_from_contact, assign_agent_to_contact, export_contacts, send_message, send_template, send_attachment, send_contact_card, change_conversation_status, sync_meta_templates, send_flow, move_contact_to_funnel_stage, toggle_bot_status, create_custom_field, update_custom_field, delete_custom_field, create_label, update_label, delete_label.

(Criterio: lectura pura = readOnly; cualquier creación, edición, borrado, mensajería, movimiento, toggle, export o sync = destructive, siguiendo la guía del reviewer.)

## 4. Privacy

- **Manifest:** `privacy_policies: ["https://www.wasapi.io/org/politica-de-privacidad"]` (la política del servicio externo que procesa los datos: Wasapi).
- **README:** nueva sección **"Privacidad"** que aclare:
  - El servidor MCP corre **localmente** en la máquina del usuario.
  - Envía la API key y las solicitudes **únicamente** a la API de Wasapi; no transmite datos al publicador del paquete.
  - No recolecta, almacena ni comparte datos por su cuenta. La API key se guarda donde el cliente MCP la configure (keychain del SO en Claude Desktop).
  - El tratamiento de datos por parte de Wasapi se rige por su [política de privacidad](https://www.wasapi.io/org/politica-de-privacidad).
  - Contacto/soporte: issues del repo.

## 5. Empaque y docs

1. `scripts/generate-manifest.mjs`: agregar `privacy_policies` al objeto manifest + al `manifestSchema` (zod: `z.array(z.string().url())`).
2. Test de `generate-manifest`: aserta que `privacy_policies` está presente y es la URL de Wasapi.
3. README: sección "Privacidad" (+ en la tabla de contenidos). Verificar que haya ≥3 prompts de ejemplo (ya hay) y soporte.
4. `manifest_version` se queda en `0.3` (actual).
5. Versión objetivo: **v1.1.0** (feature: directory-readiness; sin breaking changes).

## 6. Testing

- `tests/unit/tool-annotations.test.ts`: (a) toda tool de `allTools` tiene anotación; (b) las read-only conocidas dan `readOnlyHint:true`; (c) las destructivas dan `destructiveHint:true`; (d) `getAnnotations` de un nombre desconocido cae a destructive.
- `tests/unit/server.test.ts`: extender para verificar que la respuesta `tools/list` incluye `annotations` con `title` y el hint correcto en al menos una read y una write.
- `generate-manifest.test.ts`: `privacy_policies` presente.
- Estimado: de 256 a ~262 tests.

## 7. Release y submission

- v1.1.0: npm publish (`@wasapi/mcp-server@1.1.0`) + rebuild `.mcpb` + GitHub Release en `Vinix-Code-Dev/wasapi-mcp-server`.
- Crear `docs/anthropic-submission.md`: checklist + datos para el formulario (nombre, descripción, categoría, URL del `.mcpb` del release, privacy URL, soporte, y nota de "cuenta de prueba con datos de ejemplo" que el usuario provee al reviewer).
- El **usuario** envía el formulario (requiere cuenta y proveer una API key de prueba con datos de ejemplo para la revisión).

## 8. Preguntas abiertas

- Verificar en el smoke que `tools/list` efectivamente entrega las `annotations` (inspeccionar el JSON-RPC como hicimos en v0.1) antes de enviar el formulario.
- Si el reviewer pide una política de privacidad específica del MCP (no solo la de Wasapi), evaluar agregar `PRIVACY.md` en el repo y sumar su URL HTTPS al array. Por ahora basta la de Wasapi + la sección del README.
