# Módulos conversations, labels y reports (SDK 2.0.0) — Design Spec

**Date:** 2026-06-16
**Status:** Approved (brainstorming phase)
**Owner:** juanpablo@wasapi.io
**Relates to:** [bot/workflow/customFields/user v0.7.0](./2026-06-14-bot-workflow-customfields-user-design.md) · versión objetivo: **v0.8.0**

## 1. Propósito

El SDK `@wasapi/js-sdk` saltó de `0.1.38` a **`2.0.0`** (bump mayor) y agregó 3 módulos nuevos: `conversations`, `labels`, `reports`. Este release los expone en el MCP, llevándolo de 51 a **62 tools**, y cierra la limitación histórica de `list_conversations`.

## 2. Compatibilidad del bump 2.0.0 (verificado)

- `npm run typecheck` pasa limpio con 2.0.0 instalado — ningún método usado por las 51 tools existentes cambió de firma ni fue eliminado.
- El constructor `new WasapiClient({ apiKey, baseURL?, from_id? } | string)` es idéntico al de 0.1.38; `src/wasapi.ts` no requiere cambios.
- Los 230 tests existentes pasan sin cambios.
- Conclusión: para nuestro uso, 2.0.0 es **retrocompatible y puramente aditivo**. `package.json` ya quedó en `^2.0.0`.

## 3. Fuente de verdad

Verificado contra el `.d.ts` instalado (v2.0.0). Módulos montados como `client.conversations`, `client.labels`, `client.reports` (confirmado en `dist/esm/wasapi/index.js`).

## 4. Tools de conversations (2) — `src/tools/conversations/`

| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `list_conversations` | `conversations.getAll(params?)` | todos opcionales: `query?`, `search_type?: enum["contactName","all"]`, `status?: enum["open","hold","closed"]`, `phones?`, `labels?`, `agents?`, `dates?`, `without_labels?: boolean`, `open_options?: enum["0","1","2","3"]`, `order_conversations?: enum["0","1"]`, `all_agents?: boolean`, `cursor?`, `per_page?: number` |
| `get_conversations_next_page` | `conversations.getNextPage(cursor, params?)` | `cursor: string` (req, posicional) + los mismos filtros opcionales que `list_conversations` excepto `cursor`; el handler llama `getNextPage(cursor, rest)` |

Params snake_case → se pasan tal cual (el SDK ya usa snake_case aquí, sin remapeo). La descripción de `list_conversations` aclara que es el listado paginado de conversaciones (distinto de `get_conversation`, que trae el hilo de mensajes con un contacto puntual).

## 5. Tools de labels (6) — `src/tools/labels/`

| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `list_labels` | `labels.getAll()` | sin args |
| `search_labels` | `labels.getSearch(name)` | `name: string` (req) → posicional |
| `get_label` | `labels.getById(id)` | `label_id: string` (req) → posicional |
| `create_label` | `labels.create({title, description?, color})` | `title: string` (req), `color: string` (req), `description?: string` |
| `update_label` | `labels.update({id, data})` | `label_id: string` (req), `title: string` (req), `color: string` (req), `description?: string` → mapea a `{ id: label_id, data: { title, color, description } }` |
| `delete_label` | `labels.delete(id)` | `label_id: string` (req) → posicional |

Nota: estas son las etiquetas como entidad (CRUD). Adjuntar/quitar etiquetas a un contacto sigue siendo `add_label_to_contact` / `remove_label_from_contact` (módulo contacts, ya existentes).

## 6. Tools de reports (3) — `src/tools/reports/`

| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `get_agent_performance_report` | `reports.getPerformanceByAgent({start_date, end_date, agent_id?})` | `start_date: string` (req), `end_date: string` (req), `agent_id?: number` |
| `get_workflow_volume_report` | `reports.getVolumeOfWorkflow({start_date, end_date, from_id?})` | `start_date` (req), `end_date` (req), `from_id?: number` |
| `get_satisfaction_survey_report` | `reports.getSatisfactionSurvey({start_date, end_date, agent_id?})` | `start_date` (req), `end_date` (req), `agent_id?: number` |

**Decisión de diseño (filtros, no emisores):** en reports, `from_id` y `agent_id` son **filtros opcionales** — si se omiten, el reporte cubre todos los números/agentes. Por eso **NO** se aplica el fallback `resolveFromId` (que forzaría un único número). Esto difiere de las tools de envío, donde `from_id` identifica al emisor y sí usa fallback. El handler pasa los params tal cual (snake_case), omitiendo los opcionales no provistos.

**Fechas:** `start_date`/`end_date` con formato `YYYY-MM-DD` (mismo confirmado para metrics en v0.6.0). Requeridos en los 3 reportes.

## 7. Manejo de errores

Sin cambios: todo pasa por `wrapHandler` + `mapError`.

## 8. Cierre de limitación

`list_conversations` deja de ser "no implementado". Se actualiza:
- README → quitar la fila de la tabla "Limitaciones conocidas".
- `docs/sdk-surface.md` → reemplazar la nota "listConversations does not exist" por la documentación del módulo conversations.

## 9. Empaque y docs (mismo release)

1. `scripts/generate-manifest.mjs`: `TOOLS` de 51 → 62 (descripciones en español).
2. Test del manifest: de 51 a 62 nombres en el orden agregado (conversations, labels, reports).
3. `tests/contracts/sdk-shapes.test.ts`: +11 `expectTypeOf(...).toBeFunction()`.
4. README: tres grupos nuevos — **Conversaciones (2)**, **Etiquetas (6)**, **Reportes (3)**; total 62; 1-2 ejemplos en "¿Qué puedo hacer?"; quitar la limitación de list_conversations.
5. `docs/sdk-surface.md`: documentar los 3 módulos nuevos + cerrar el gap de conversaciones.
6. Versión objetivo: **v0.8.0** (minor — el SDK saltó a 2.0 pero nuestra API pública de tools es aditiva, sin breaking changes para el usuario del MCP).

## 10. Testing

Patrón existente (mock del client, asserts sobre args al SDK y shape de respuesta):
- `tests/unit/tools/conversations.test.ts` — getAll sin args y con filtros; getNextPage con cursor posicional + filtros
- `tests/unit/tools/labels.test.ts` — 6 tools (posicional de getSearch/getById/delete; mapeo `{id, data}` de update; requeridos)
- `tests/unit/tools/reports.test.ts` — 3 tools (requeridos start/end; opcionales agent_id/from_id se incluyen sólo si se proveen; mapeo snake_case)
- Tests del manifest y contratos actualizados.
- Estimado: de 230 a ~250 tests.

## 11. Release

- v0.8.0: npm publish + rebuild `.mcpb` + GitHub Release con assets.
- Smoke contra la cuenta real: `list_conversations` (el headline), `list_labels`, y un reporte con fechas (`get_agent_performance_report`). Documentar shapes observados en `docs/sdk-surface.md`.

## 12. Preguntas abiertas (resolver en implementación)

- Forma exacta del cursor que devuelve `list_conversations` para alimentar `get_conversations_next_page` (campo en la respuesta) — documentar tras el smoke.
- Formato de `dates` en `list_conversations` (rango `YYYY-MM-DD,YYYY-MM-DD` probable) — confirmar en smoke.
- Valores válidos / significado de `open_options` y `order_conversations` (enums de string numérico) — documentar lo que se observe; por ahora se exponen como enums tal cual el `.d.ts`.
