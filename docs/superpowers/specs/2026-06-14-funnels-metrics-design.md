# Módulos funnels y metrics — Design Spec

**Date:** 2026-06-14
**Status:** Approved (brainstorming phase)
**Owner:** juanpablo@wasapi.io
**Relates to:** [paridad SDK v0.4.0](./2026-06-12-sdk-parity-design.md) · versión objetivo: **v0.6.0**

## 1. Propósito

Exponer en el MCP los módulos `funnels` y `metrics` del SDK `@wasapi/js-sdk`, con paridad 1:1 con su superficie pública. El MCP pasa de 29 a **43 tools**.

## 2. Fuera de alcance

- Módulos `bot`, `workflow`, `customFields`, `user` (siguiente iteración).
- El método `getAgentMetric` del módulo metrics es **privado** en el SDK — no se expone; sus 4 wrappers públicos sí.
- Sin cambios de arquitectura: mismo patrón (un archivo por tool, zod, `wrapHandler`, singleton client).

## 3. Fuente de verdad

Verificado contra el `.d.ts` instalado (v0.1.38) y el fuente en GitHub (`main`). Los módulos se montan como `client.funnels` y `client.metrics` (confirmado en `dist/esm/wasapi/index.js`).

## 4. Tools de funnels (3) — `src/tools/funnels/`

| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `list_funnels` | `funnels.getAll()` | sin args |
| `search_contact_in_funnels` | `funnels.searchContact({phoneNumber?, contactUuid?})` | `phone_number?: string`, `contact_uuid?: string`; `.refine` exige al menos uno |
| `move_contact_to_funnel_stage` | `funnels.moveContactToFunnel({funnelContactId, toStageId})` | `funnel_contact_id: number` (req), `to_stage_id: number` (req) |

**Nota de mapeo:** los nombres de parámetro de la tool son snake_case (`phone_number`, `contact_uuid`, `funnel_contact_id`, `to_stage_id`) y el handler los traduce al camelCase que espera el SDK (`phoneNumber`, `contactUuid`, `funnelContactId`, `toStageId`).

## 5. Tools de metrics (11) — `src/tools/metrics/`

### Generales sin fecha (2)
| Tool | Método SDK |
|---|---|
| `get_online_agents` | `metrics.getOnlineAgents()` |
| `get_status_contacts` | `metrics.getStatusContacts()` |

### Con rango de fechas (5) — schema `{ start_date, end_date }`
| Tool | Método SDK |
|---|---|
| `get_total_campaigns` | `metrics.getTotalCampaigns({startDate, endDate})` |
| `get_consolidated_conversations` | `metrics.getConsolidatedConversations({startDate, endDate})` |
| `get_agent_conversations` | `metrics.getAgentConversations({startDate, endDate})` |
| `get_messages` | `metrics.getMessages({startDate, endDate})` |
| `get_messages_bot` | `metrics.getMessagesBot({startDate, endDate})` |

### Por agente (4) — schema `{ agent_id, start_date, end_date }`
| Tool | Método SDK |
|---|---|
| `get_agent_time_response` | `metrics.getAgentTimeResponse({agentId, startDate, endDate})` |
| `get_agent_transferred` | `metrics.getAgentTransferred({agentId, startDate, endDate})` |
| `get_agent_volume_of_work` | `metrics.getAgentVolumeOfWork({agentId, startDate, endDate})` |
| `get_agent_time_in_conversation` | `metrics.getAgentTimeInConversation({agentId, startDate, endDate})` |

**Nota de mapeo:** parámetros de la tool en snake_case (`start_date`, `end_date`, `agent_id`); el handler los pasa al SDK como `startDate`, `endDate`, `agentId`.

## 6. Manejo de fechas

El SDK inserta `startDate`/`endDate` directamente en la URL (`?dates[]=${startDate}&dates[]=${endDate}`). Por lo tanto:
- Schema: `start_date: z.string().min(1)`, `end_date: z.string().min(1)`.
- **No** se valida formato con regex (el SDK no lo hace; no queremos rechazar un formato válido que desconocemos).
- La descripción de cada tool recomienda formato **`YYYY-MM-DD`** y menciona que es un rango.
- El formato exacto aceptado por el API se confirma en el smoke manual.

## 7. Manejo de errores

Sin cambios: todo pasa por `wrapHandler` + `mapError`.

## 8. Empaque y docs (mismo release)

1. `scripts/generate-manifest.mjs`: `TOOLS` de 29 → 43 (descripciones en español).
2. Test del manifest: de 29 a 43 nombres en el orden agregado (funnels primero, luego metrics).
3. `tests/contracts/sdk-shapes.test.ts`: +14 `expectTypeOf(...).toBeFunction()` (3 funnels + 11 metrics).
4. README: dos grupos nuevos en "Herramientas disponibles" — **Funnels (3)** y **Métricas (11)**; conteo total a 43; 1-2 ejemplos en "¿Qué puedo hacer?".
5. Versión objetivo: **v0.6.0** (minor, sin breaking changes).

## 9. Testing

Patrón existente (mock del client, asserts sobre args al SDK y shape de respuesta):
- `tests/unit/tools/funnels.test.ts` — 3 tools (incluye test del `.refine` que exige phone o uuid; test del mapeo snake→camel)
- `tests/unit/tools/metrics-general.test.ts` — las 7 sin agente (2 sin fecha + 5 con fechas)
- `tests/unit/tools/metrics-agent.test.ts` — las 4 por agente (test del mapeo `agent_id`→`agentId`, requeridos)
- Tests del manifest y de contratos actualizados.
- Estimado: de 171 a ~192 tests.

## 10. Release

- v0.6.0: npm publish + rebuild `.mcpb` + GitHub Release con assets.
- Smoke manual: `docs/mcpb-smoke.md` + probar contra la cuenta real `list_funnels`, `get_online_agents`, y una métrica con fechas (`get_messages` con un rango) para confirmar el formato de fecha.

## 11. Preguntas abiertas (resolver en implementación)

- Formato exacto de fecha aceptado por los endpoints `/dashboard/metrics/*` (probable `YYYY-MM-DD`) — confirmar en smoke y documentar en `docs/sdk-surface.md`.
- Shapes de respuesta de funnels/metrics — documentar lo observado en `docs/sdk-surface.md` tras el smoke.
