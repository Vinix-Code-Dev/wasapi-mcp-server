# Módulos bot, workflow, customFields y user — Design Spec

**Date:** 2026-06-14
**Status:** Approved (brainstorming phase)
**Owner:** juanpablo@wasapi.io
**Relates to:** [funnels + metrics v0.6.0](./2026-06-14-funnels-metrics-design.md) · versión objetivo: **v0.7.0**

## 1. Propósito

Exponer los últimos 4 módulos del SDK `@wasapi/js-sdk` sin tools en el MCP: `bot`, `workflow`, `customFields` y `user`. Con esto el MCP cubre toda la superficie funcional del SDK. Pasa de 43 a **51 tools** (+8).

## 2. Fuera de alcance

- No quedan más módulos del SDK por exponer tras este release.
- Sin cambios de arquitectura: mismo patrón (un archivo por tool, zod, `wrapHandler`, singleton client, params snake_case → SDK camelCase en el handler).

## 3. Fuente de verdad

Verificado contra el `.d.ts` instalado (v0.1.38) y los `.js` de impl. Módulos montados como `client.bot`, `client.workflow`, `client.customFields`, `client.user` (confirmado en `dist/esm/wasapi/index.js`).

## 4. Tools

### bot (1) — `src/tools/bot/`
| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `toggle_bot_status` | `bot.toggleStatus({wa_id, data:{from_id, action}})` | `wa_id: string` (req), `action: enum["enable","disable","disable_permanently"]` (req), `from_id?: number` (fallback a `resolveFromId`) |

Mapeo en el handler: `{ wa_id, data: { from_id: resolveFromId(from_id), action } }`.

### workflow (1) — `src/tools/workflow/`
| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `get_workflow_statuses` | `workflow.getStatuses({action?, phone?, agent_id?, dates?, per_page?, page?})` | `action?: enum["open","hold","closed"]`, `phone?: string`, `agent_id?: number`, `dates?: string`, `per_page?: number`, `page?: number` |

El handler pasa los params tal cual (sin remapeo de nombres — el SDK ya usa snake_case aquí: `agent_id`, `per_page`).

**Quirks del SDK conocidos (no se arreglan — política SDK-first):**
- `getStatuses` hace `console.log(response.data)`. Ya neutralizado: `src/index.ts` redirige `console.log` a stderr desde v0.2, así que no corrompe el canal MCP stdio.
- El SDK interpola params omitidos como el string literal `"undefined"` en la URL (`?action=undefined&phone=undefined...`). Se valida en smoke; si el API se queja, se reporta como issue al SDK.

### customFields (5) — `src/tools/custom-fields/`
| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `list_custom_fields` | `customFields.getAll()` | sin args |
| `get_custom_field` | `customFields.getById(id)` | `field_id: string` (req) → posicional |
| `create_custom_field` | `customFields.create({name})` | `name: string` (req) |
| `update_custom_field` | `customFields.update({id, data:{name}})` | `field_id: string` (req), `name: string` (req) → mapea a `{ id: field_id, data: { name } }` |
| `delete_custom_field` | `customFields.delete(id)` | `field_id: string` (req) → posicional |

### user (1) — `src/tools/user/`
| Tool | Método SDK | Schema (zod) |
|---|---|---|
| `get_current_user` | `user.getUser()` | sin args |

## 5. Manejo de errores

Sin cambios: todo pasa por `wrapHandler` + `mapError`.

## 6. Empaque y docs (mismo release)

1. `scripts/generate-manifest.mjs`: `TOOLS` de 43 → 51 (descripciones en español).
2. Test del manifest: de 43 a 51 nombres en el orden agregado (bot, workflow, customFields, user).
3. `tests/contracts/sdk-shapes.test.ts`: +8 `expectTypeOf(...).toBeFunction()` (1 bot + 1 workflow + 5 customFields + 1 user). Nota: `getUser`/`toggleStatus`/etc. son públicos en `WasapiClient`, acceso de tipo válido sin `as any`.
4. README: cuatro grupos nuevos en "Herramientas disponibles" — **Bot (1)**, **Workflow (1)**, **Campos personalizados (5)**, **Usuario (1)**; conteo total a 51; 1 ejemplo nuevo en "¿Qué puedo hacer?".
5. Versión objetivo: **v0.7.0** (minor, sin breaking changes).

## 7. Testing

Patrón existente (mock del client, asserts sobre args al SDK y shape de respuesta):
- `tests/unit/tools/bot.test.ts` — toggle con mapeo `{wa_id, data:{from_id, action}}` + fallback de from_id + rechazo de action inválida
- `tests/unit/tools/workflow.test.ts` — get_workflow_statuses con args y sin args (todos opcionales)
- `tests/unit/tools/custom-fields.test.ts` — 5 tools (mapeo posicional de getById/delete, mapeo `{id, data}` de update, requeridos)
- `tests/unit/tools/user.test.ts` — get_current_user sin args
- Tests del manifest y contratos actualizados.
- Estimado: de 209 a ~225 tests.

## 8. Release

- v0.7.0: npm publish + rebuild `.mcpb` + GitHub Release con assets.
- Smoke manual contra la cuenta real: `get_current_user`, `list_custom_fields`, `get_workflow_statuses` (con y sin filtros — para validar el quirk de `"undefined"` en la URL). Documentar lo observado en `docs/sdk-surface.md`.

## 9. Preguntas abiertas (resolver en implementación)

- Formato de `dates` en `get_workflow_statuses` (probable rango `YYYY-MM-DD,YYYY-MM-DD` o similar) — confirmar en smoke.
- Comportamiento del quirk `"undefined"` en la URL de workflow cuando se omiten filtros — confirmar si el API lo tolera; documentar.
