# Paridad con el SDK: módulos whatsapp y contacts — Design Spec

**Date:** 2026-06-12
**Status:** Approved (brainstorming phase)
**Owner:** juanpablo@wasapi.io
**Relates to:** [MCP v0.1](./2026-06-10-wasapi-mcp-design.md) · versión objetivo: **v0.4.0**

## 1. Propósito

Igualar la superficie del MCP con TODO lo que `@wasapi/js-sdk` expone hoy en los módulos `whatsapp` y `contacts`. El MCP pasa de 12 a **27 tools**, y dos tools existentes se enriquecen con parámetros que el SDK soporta y no exponíamos.

Esto además entrega los **WhatsApp Flows** (el pedido original de "flows" — viven dentro del módulo whatsapp del SDK) y elimina dos limitaciones documentadas: variables de plantilla y envío de archivos por URL (vía template).

## 2. Fuera de alcance

- Módulos `campaigns`, `bot`, `funnels`, `workflow`, `metrics`, `customFields`, `user` (siguiente iteración; nota: `campaigns.create/update/delete` son stubs que lanzan "not implemented" en el SDK — gap a reportar).
- `contacts.getAll` — sin paginación; `getSearch` (ya expuesto como `list_contacts`) es superset. Omitido deliberadamente (YAGNI).
- `whatsapp.getAppIdByFromId` — helper interno de resolución de IDs. Omitido deliberadamente.
- Cambios de arquitectura: se mantiene el patrón actual (un archivo por tool, zod, `wrapHandler`, singleton client).

## 3. Tools nuevas (15)

Fuente de verdad de los shapes: `node_modules/@wasapi/js-sdk/dist/types/wasapi/models/`. Los schemas zod deben replicar lo requerido/opcional de cada tipo del SDK.

### Contacts (2 nuevas → módulo queda 9/10, paridad efectiva)

| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `assign_agent_to_contact` | `contacts.assingAgentAutomatic({contact_uuid})` | `contact_uuid: string` (req) |
| `export_contacts` | `contacts.export({email_urls?})` | `email_urls: string[].email()` (opc). Devuelve void → respuesta MCP: `{success: true, message: "Exportación iniciada"}` |

### WhatsApp — Templates (5 nuevas)

| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `list_whatsapp_templates` | `getWhatsappTemplates()` | sin args |
| `get_whatsapp_template` | `getWhatsappTemplate({template_uuid})` | `template_uuid: string` (req) |
| `get_template_fields` | `getFieldsTemplate(template_uuid)` | `template_uuid: string` (req) |
| `list_templates_by_number` | `getTemplatesByAppId({from_id})` | `from_id: number` (req) |
| `sync_meta_templates` | `syncMetaTemplates()` | sin args. Descripción debe avisar: sincroniza desde Meta, puede tardar |

### WhatsApp — Conversación y mensajes (2 nuevas)

| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `change_conversation_status` | `changeStatus({from_id, wa_id, status, message?, agent_id?, validate_assigned_status?, send_end_message?, origin?})` | `wa_id: string` (req), `status: enum[open,hold,closed]` (req), `from_id?: number` (fallback a `resolveFromId`), `message?: string`, `agent_id?: number`, `send_end_message?: boolean` |
| `send_contact_card` | `sendContacts({wa_id, from_id?, context_wam_id?, contacts})` | `wa_id: string` (req), `contacts: array` (req, min 1) con shape `ContactWPP` (name{formatted_name?, first_name?, ...}, phones?, emails?, org?, urls?, addresses?, birthday?), `from_id?: number` (fallback), `context_wam_id?: string` |

### WhatsApp — Flows (6 nuevas) 🎯

| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `list_flows` | `getFlows()` | sin args |
| `list_flows_by_number` | `getFlowsByPhoneId(from_id?)` | `from_id?: number` (fallback a `resolveFromId`) |
| `send_flow` | `sendFlow({wa_id, message, phone_id?, cta, screen, flow_id, action?})` | `wa_id: string` (req), `message: string` (req), `cta: string` (req), `screen: string` (req), `flow_id: string` (req), `phone_id?: number` (fallback a `resolveFromId`), `action?: enum[navigate,data_exchange]` |
| `get_flow_responses` | `getFlowResponses({flow_id, page?, per_page?})` | `flow_id: string` (req), `page?: number`, `per_page?: number` |
| `get_flow_assets` | `getFlowAssets({flow_id, phone_id?})` | `flow_id: string` (req), `phone_id?: number` (fallback) |
| `get_flow_screens` | `getFlowScreens({flow_id, phone_id?})` | `flow_id: string` (req), `phone_id?: number` (fallback) |

**Convención `from_id`/`phone_id`:** donde el SDK lo acepta opcional, la tool lo expone opcional con fallback al helper `resolveFromId` existente (`src/lib/from-id.ts`), igual que `send_message`.

## 4. Tools existentes que se enriquecen (2)

### `send_template` — upgrade mayor

Schema actual: `recipients: string[]`, `template_id`, `contact_type: string`, `from_id?`.

Schema nuevo (espejo de `SendTemplate` del SDK):
- `recipients` — **verificar tipo real**: el type def dice `string` (probablemente CSV de wa_ids); nuestra tool actual usa array. El implementador debe revisar `src/wasapi/modules/whatsapp.ts` del SDK fuente y/o probar contra el API. Si el SDK espera string, la tool puede seguir aceptando `string[]` y hacer `join(",")` en el handler — más ergonómico para el modelo.
- `contact_type: enum["phone","contact"]` (antes string libre)
- `body_vars?: Array<{text: string, val: string|number}>` ✨ variables de cuerpo
- `header_var?: Array<{text, val}>` ✨ variable de header
- `cta_var?: Array<{text, val}>` ✨ variable de CTA
- `file?: enum[document,video,image,audio]` + `url_file?: string.url()` + `file_name?: string` ✨ adjuntos por URL
- `chatbot_status?: enum[enable,disable,disable_permanently]`
- `conversation_status?: enum[open,hold,closed,unchanged]`
- `agent_id?: number`
- `from_id?` se mantiene con fallback

La descripción de la tool debe explicar `body_vars` con un ejemplo, porque es lo que más van a usar.

### `send_attachment` — upgrade menor

Agregar `filename?: string` (nombre con el que llega el archivo al destinatario).

## 5. Actualizaciones de empaque y docs (mismo release)

1. **`scripts/generate-manifest.mjs`:** el array `TOOLS` pasa de 12 a 27 entradas (descripciones en español). Su test (`declares all 12 tools`) se actualiza a 27.
2. **README:** tabla de herramientas reorganizada por grupos (Contactos 9 / WhatsApp Mensajería 7 / Plantillas 6 / Flows 6 — los números finales según conteo real), y la tabla "Limitaciones conocidas" se reduce: salen "send_template sin variables" y se matiza "send_attachment requiere ruta local" (templates ya soportan URL).
3. **`docs/sdk-surface.md`:** actualizar con la superficie completa verificada de ambos módulos (quedó desactualizado desde v0.1).
4. Versión objetivo: **v0.4.0** (minor — features nuevas sin breaking changes). El cambio de `contact_type` de string libre a enum es técnicamente más estricto pero corrige uso inválido, aceptable en minor.

## 6. Manejo de errores

Sin cambios: todo pasa por `wrapHandler` + `mapError`. Las tools de export y sync (side-effects largos del lado Wasapi) devuelven la respuesta del SDK tal cual; si el SDK devuelve void, el handler responde `{success: true, message: <acción iniciada>}`.

## 7. Testing

Patrón idéntico al existente (mock del client, asserts sobre args pasados al SDK y shape de respuesta):

- 1 archivo de test por tool nueva (15 archivos, ~2-3 tests c/u: happy path, validación de campo requerido, fallback de from_id donde aplique).
- Tests actualizados de `send_template` (variables, url_file, enum contact_type) y `send_attachment` (filename).
- Test de `generate-manifest` actualizado: 27 tools, nombres exactos.
- Contract tests (`tests/contracts/sdk-shapes.test.ts`): agregar `expectTypeOf` por cada método SDK nuevo usado.
- Estimado: de 129 a ~175 tests.

## 8. Release

- v0.4.0: npm publish + rebuild `.mcpb` + GitHub Release con assets nuevos (el manifest dentro del bundle lista las 27 tools).
- Smoke manual: `docs/mcpb-smoke.md` (sin cambios de proceso) + probar 2-3 tools nuevas contra la cuenta real (list_flows, list_whatsapp_templates, get_template_fields).

## 9. Preguntas abiertas (resolver en implementación)

- Tipo real de `recipients` en `sendTemplate` (string CSV vs array) — revisar implementación del SDK y decidir si la tool normaliza.
- Shape de respuesta de `getFlowsByPhoneId`, `getFieldsTemplate`, `getFlowScreens` (el SDK los tipa `any`) — documentar lo observado en `docs/sdk-surface.md`.
- Si `export_contacts` sin `email_urls` exporta igual (validador del SDK lo permite como opcional) — probar y documentar en la descripción de la tool.
