# Diseño: soporte de campañas en el MCP de Wasapi

- **Fecha:** 2026-07-06
- **Estado:** Aprobado el diseño (pendiente review del spec escrito)
- **Repos afectados:** `wasapi-mcp-server` (principal) y `wasapi-backend` (endpoint de cancelar)

## Contexto

El MCP (`@wasapi/mcp-server`) expone la API de Wasapi como tools MCP. Hoy tiene `list_campaigns` y `get_campaign` (lectura), pero **no puede crear campañas**: el SDK `@wasapi/js-sdk` tiene `campaigns.create()/update()/delete()` como stubs que lanzan error, y `create()` devuelve `void`.

El backend ya expone la API pública v1 de campañas:
- `POST /campaigns` (`Api\CampaignsController@store`) — crea y encola una campaña; responde `{ success, data: CampaignPublic, recipients: { matched, skipped } }`.
- `GET /campaigns/{campaign_uuid}/stats` — conteos por estado.
- `GET /campaigns/{campaign_uuid}/logs` — detalle por contacto (paginación por cursor).
- **No** existe un endpoint público y seguro para cancelar (el legacy `POST /campaigns/cancel` recibe `{id}` numérico y tiene IDOR — sin scoping por tenant).

Además, en el backend se agregó recientemente un query param `phone_id` a `GET /whatsapp-templates` para filtrar plantillas por línea.

### Detalle técnico relevante del MCP

- **Dos modos de operación**, ambos resueltos por `getClient()` (`src/wasapi.ts`):
  - `stdio`: una `WASAPI_API_KEY` de entorno (singleton).
  - `serve`: OAuth por usuario; credenciales por request vía `getContext()` (AsyncLocalStorage). Es el conector remoto.
- `WasapiClient.getClient()` devuelve un `AxiosClient` **público** con `get/post/put/delete`, `baseURL` (default `https://api-ws.wasapi.io/api/v1`) y `Authorization: Bearer` ya configurados. **Funciona en ambos modos** porque se obtiene desde `getClient()`.
- Patrón de tool: cada archivo en `src/tools/**` exporta `ToolDefinition { name, description, schema (Zod), handler }`; se agrega a `allTools` (`src/tools/index.ts`) y a `TOOL_ANNOTATIONS` (`src/lib/tool-annotations.ts`). El `wrapHandler` valida con Zod, serializa el resultado y mapea errores con `mapError` a mensajes en **español**.
- Todas las descripciones y mensajes del MCP están en **español**.

## Objetivos

1. Permitir **crear/enviar campañas** desde el MCP, con un flujo guiado que **pregunte al usuario** cómo definir destinatarios (`labels` / `contact_ids` / `phones` / `all`).
2. Exponer **monitoreo**: stats y logs por campaña.
3. Exponer **cancelar** campaña de forma **segura** (uuid + tenant).
4. Que el flujo use correctamente la **línea** (`phone_id`) y las **plantillas por línea**.
5. Dejar "el proceso" muy claro para el modelo cliente.

## No-objetivos (YAGNI)

- No actualizar `@wasapi/js-sdk` en esta iteración (se eligió HTTP directo aislado; migrable después).
- No agregar un MCP *prompt* dedicado (posible v2).
- No agregar una tool de subida de media (se pasa `media.url`; puede obtenerse con el flujo de adjuntos existente).
- No tocar `list_templates_by_number` (ya lista plantillas por línea vía SDK `getTemplatesByAppId`).

## Decisiones (con justificación)

| # | Decisión | Elección | Razón |
|---|---|---|---|
| 1 | Alcance "whatsapp numbers" | Filtro de plantillas por línea + que el flujo use bien el `phone_id` | Es lo que habilita elegir plantilla correcta por línea |
| 2 | Alcance campañas | create + stats + logs + cancel | Cubre crear y monitorear/rectificar |
| 3 | Implementación create/cancel | **HTTP directo aislado** (módulo propio que reutiliza el axios del SDK) | Entrega ya, sin publicar SDK; encapsulado y migrable |
| 4 | Resguardo de envío | Tool única `create_campaign` con `confirm=true` obligatorio | Simple; evita envíos accidentales |
| 5 | v1 de create | variables + media header + scheduling + opciones avanzadas | Paridad con `POST /campaigns` |
| 6 | Cancelar | **Nuevo endpoint público seguro** `POST /campaigns/{campaign_uuid}/cancel` (uuid, tenant-scoped) | Evita el IDOR y la inconsistencia id/uuid del legacy |

## Arquitectura

### A) Backend — nuevo endpoint de cancelar (`wasapi-backend`)

- **Ruta:** `POST /campaigns/{campaign_uuid}/cancel` en `Api\CampaignsController@cancel`, dentro del grupo autenticado de la API v1 pública (junto a `stats`/`logs`).
- **Lógica:** resolver la campaña por `uuid` **scoped al management account** (mismo patrón que `stats`/`logs`); si no existe o no es de la cuenta → `404`. Si `status === 'scheduled'` → `status = 'cancel'`; cancelar los `CampaignJobs` en `pending` de esa campaña. Responder `{ success: true, data: CampaignPublic }`.
- **Swagger:** agregar la operación `cancelCampaign` en `wasapi-v3-frontend/public/apidocs/wasapi-v2.yaml` con respuestas 200/401/404/422.
- **Nota:** el endpoint legacy `POST /campaigns/cancel` (IDOR) se deja intacto en esta iteración; su corrección/retiro queda fuera de alcance (se puede rastrear aparte).

### B) MCP — módulo de transporte (`src/lib/campaigns-api.ts`)

Módulo aislado que centraliza las llamadas HTTP de campañas reutilizando el axios del SDK:

```ts
import { getClient } from "../wasapi.js";
function http() { return getClient().getClient(); } // AxiosClient (baseURL+auth, ambos modos)

export async function createCampaign(payload): Promise<CreateCampaignResult> {
  const { data } = await http().post("/campaigns", payload);
  return data; // { success, data, recipients:{matched,skipped} }
}
export async function getCampaignStats(uuid: string) {
  const { data } = await http().get(`/campaigns/${uuid}/stats`); return data;
}
export async function getCampaignLogs(uuid: string, cursor?: string, perPage?: number) {
  const { data } = await http().get(`/campaigns/${uuid}/logs`, { params: { cursor, per_page: perPage } });
  return data;
}
export async function cancelCampaign(uuid: string) {
  const { data } = await http().post(`/campaigns/${uuid}/cancel`, {}); return data;
}
```

Tipos (`CreateCampaignPayload`, etc.) viven en este módulo. Los errores se propagan y los mapea el `wrapHandler`/`mapError` central.

### C) MCP — tools nuevas (`src/tools/campaigns/`)

| Tool | Archivo | Endpoint | Annotation |
|---|---|---|---|
| `create_campaign` | `create.ts` | POST /campaigns | W (write/destructive) |
| `get_campaign_stats` | `stats.ts` | GET /campaigns/{uuid}/stats | R |
| `get_campaign_logs` | `logs.ts` | GET /campaigns/{uuid}/logs | R |
| `cancel_campaign` | `cancel.ts` | POST /campaigns/{uuid}/cancel | W |

Se registran en `src/tools/index.ts` (`allTools`) y se agrega su entrada en `TOOL_ANNOTATIONS`. Se elimina el `NOTE` de "campaigns create/update/delete not implemented".

### D) `create_campaign` — schema Zod y comportamiento

Schema (refleja `POST /campaigns`):

```ts
z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  template_uuid: z.string().uuid(),
  phone_id: z.number().int().positive(),
  recipients: z.object({
    type: z.enum(["phones", "contact_ids", "labels", "all"]),
    values: z.array(z.union([z.string(), z.number()])).optional(),
  }),
  variables: z.object({
    body: z.array(z.string()).optional(),
    header: z.string().optional(),
    buttons: z.array(z.string()).optional(),
  }).optional(),
  media: z.object({
    type: z.enum(["image", "video", "document"]),
    url: z.string().url(),
    filename: z.string().optional(),
  }).optional(),
  scheduled_at: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/).optional(),
  conversation_status: z.enum(["unchanged", "open", "closed", "hold"]).optional(),
  disable_chatbot: z.boolean().optional(),
  confirm: z.boolean(),
}).refine(v => v.recipients.type === "all" || (v.recipients.values?.length ?? 0) > 0,
  { message: "recipients.values es requerido salvo type=all" });
```

Comportamiento del handler:
- **`confirm !== true`** → **no** llama al API. Devuelve un *preview*: el payload que se enviaría + conteos locales (p. ej. `recipients.values.length` para phones/contact_ids/labels) + mensaje: "Previsualización: vuelve a llamar con `confirm=true` para enviar. El total real (`matched`) se calcula al confirmar." (El backend no tiene dry-run, por eso el `matched` exacto sólo existe tras crear.)
- **`confirm === true`** → `createCampaign(payloadSinConfirm)`; devuelve `{ data, recipients:{matched, skipped} }`.

### E) MCP — el "proceso" vía `instructions` del server

`buildServer()` (`src/server.ts`) hoy no expone `instructions`. Se agregan como tercer dato en las opciones del `Server` del SDK MCP, con la guía en español:

> **Flujo para crear una campaña:**
> 1. Elegir la línea con `list_whatsapp_numbers` (usar el `id` como `phone_id`; preferir líneas con `can_send_message: AVAILABLE`).
> 2. Elegir la plantilla de esa línea con `list_templates_by_number` y consultar sus variables con `get_template_fields`.
> 3. **Preguntar al usuario cómo definir los destinatarios**: `labels`, `contact_ids`, `phones` o `all`. Según la respuesta, usar `list_labels`/`search_labels` o `list_contacts` para reunir los IDs.
> 4. Armar `variables` según la plantilla (body/header/buttons) y `media` si la plantilla lleva header multimedia.
> 5. Llamar `create_campaign` primero **sin** `confirm` (preview), mostrar el resumen al usuario y luego con `confirm=true` para enviar.
> 6. Post-envío: `get_campaign_stats` y `get_campaign_logs`.

Cada tool nueva repite lo esencial en su `description` (preguntar destinatarios; `confirm=true` para enviar).

## Flujo de datos (resumen)

```
list_whatsapp_numbers ─→ phone_id
list_templates_by_number(phone_id) ─→ template_uuid
get_template_fields(template_uuid) ─→ variables requeridas
[preguntar tipo destinatarios] ─→ list_labels / list_contacts ─→ values
create_campaign(confirm=false) ─→ preview
create_campaign(confirm=true) ─→ POST /campaigns ─→ { uuid, matched, skipped }
get_campaign_stats(uuid) / get_campaign_logs(uuid)
cancel_campaign(uuid) (si estaba scheduled)
```

## Manejo de errores

- Reutilizar `mapError` central. Verificar que mapea correctamente los errores axios del `AxiosClient` del SDK, incluyendo los estados propios del endpoint: `402` (límite de contactos del plan), `422` (validación), `503` (plantilla inválida / número incorrecto / límite diario de Meta). Si algún estado no produce un mensaje claro, extender `mapError`.

## Testing

Siguiendo `tests/unit/tools/*` y los mocks existentes de `getClient`:
- `create_campaign`: (a) `confirm=false` devuelve preview y **no** hace HTTP; (b) `confirm=true` hace `POST /campaigns` con el body correcto (sin `confirm`); (c) validaciones (values requerido salvo `all`, forma de media, formato de `scheduled_at`).
- `get_campaign_stats` / `get_campaign_logs` / `cancel_campaign`: llaman al endpoint correcto y retornan `data`; logs pasa `cursor`/`per_page`.
- Anotaciones: si hay test que exige annotation por tool, cubrir las 4 nuevas.
- Backend: feature test PHPUnit para `cancel` (happy path scheduled→cancel; 404 de otra cuenta; no cancela si ya `sent`).

## Cambios por archivo

**wasapi-mcp-server**
- `src/lib/campaigns-api.ts` (nuevo)
- `src/tools/campaigns/create.ts` (nuevo)
- `src/tools/campaigns/stats.ts` (nuevo)
- `src/tools/campaigns/logs.ts` (nuevo)
- `src/tools/campaigns/cancel.ts` (nuevo)
- `src/tools/index.ts` (registrar 4 tools; quitar NOTE)
- `src/lib/tool-annotations.ts` (4 entradas)
- `src/server.ts` (agregar `instructions`)
- Tests unitarios de las 4 tools
- (posible) `src/lib/errors.ts` si falta mapear 402/503

**wasapi-backend**
- `app/Http/Controllers/Api/CampaignsController.php` (método `cancel`)
- `routes/api.php` (ruta `POST /campaigns/{campaign_uuid}/cancel`)
- Feature test del cancel

**wasapi-v3-frontend**
- `public/apidocs/wasapi-v2.yaml` (operación `cancelCampaign`)

## Riesgos / ítems a confirmar en implementación

- Confirmar que el SDK MCP (`@modelcontextprotocol/sdk` Server) acepta `instructions` en opciones y que los clientes lo muestran.
- Confirmar el shape de error de `AxiosClient` para el mapeo de 402/503.
- El *preview* no da `matched` exacto (limitación del backend, documentada).
