# Funnels + Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the `funnels` (3) and `metrics` (11) SDK modules to the MCP, taking it from 29 to 43 tools.

**Architecture:** Identical to existing pattern — one file per tool exporting `{name, description, schema, handler}`, zod via `wrapHandler`, singleton client from `src/wasapi.ts`. Tool params are snake_case and the handler maps them to the SDK's camelCase. No `from_id`/`resolveFromId` (these modules don't use it).

**Tech Stack:** TypeScript, zod v3, vitest. No new deps.

**Spec:** `docs/superpowers/specs/2026-06-14-funnels-metrics-design.md`

**SDK ground truth:** `client.funnels` / `client.metrics`. Tool handlers use `(client.funnels as any).method(...)` / `(client.metrics as any).method(...)` matching the established `as any` convention in existing tools.

**Test mock convention:** `vi.mock("../../../src/wasapi.js", () => ({ getClient: () => ({ funnels: mocks }) }))`; assert exact args passed to the SDK mock via `wrapHandler(tool.schema, tool.handler)`.

---

## Task 1: Funnels — 3 tools

**Files:**
- Create: `src/tools/funnels/list.ts`, `src/tools/funnels/search-contact.ts`, `src/tools/funnels/move-contact.ts`
- Create: `tests/unit/tools/funnels.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/funnels.test.ts
import { describe, it, expect, vi } from "vitest";
import { listFunnelsTool } from "../../../src/tools/funnels/list.js";
import { searchContactInFunnelsTool } from "../../../src/tools/funnels/search-contact.js";
import { moveContactToFunnelStageTool } from "../../../src/tools/funnels/move-contact.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  searchContact: vi.fn().mockResolvedValue({ success: true, data: {} }),
  moveContactToFunnel: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ funnels: mocks }),
}));

describe("funnels tools", () => {
  it("list_funnels takes no args", async () => {
    const h = wrapHandler(listFunnelsTool.schema, listFunnelsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalled();
  });

  it("search_contact_in_funnels maps snake_case to camelCase", async () => {
    const h = wrapHandler(searchContactInFunnelsTool.schema, searchContactInFunnelsTool.handler);
    await h({ phone_number: "573001112233" });
    expect(mocks.searchContact).toHaveBeenCalledWith({ phoneNumber: "573001112233", contactUuid: undefined });
  });

  it("search_contact_in_funnels rejects when neither phone nor uuid given", async () => {
    const h = wrapHandler(searchContactInFunnelsTool.schema, searchContactInFunnelsTool.handler);
    expect((await h({})).isError).toBe(true);
  });

  it("move_contact_to_funnel_stage requires both ids and maps them", async () => {
    const h = wrapHandler(moveContactToFunnelStageTool.schema, moveContactToFunnelStageTool.handler);
    expect((await h({ funnel_contact_id: 1 })).isError).toBe(true);
    await h({ funnel_contact_id: 12, to_stage_id: 5 });
    expect(mocks.moveContactToFunnel).toHaveBeenCalledWith({ funnelContactId: 12, toStageId: 5 });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/tools/funnels.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the 3 tools**

```ts
// src/tools/funnels/list.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listFunnelsTool: ToolDefinition<typeof schema> = {
  name: "list_funnels",
  description: "Lista todos los embudos (funnels) de venta de la cuenta Wasapi, con sus etapas.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.funnels as any).getAll();
  },
};
```

```ts
// src/tools/funnels/search-contact.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z
  .object({
    phone_number: z.string().min(1).optional(),
    contact_uuid: z.string().min(1).optional(),
  })
  .refine((v) => v.phone_number || v.contact_uuid, {
    message: "Debes indicar phone_number o contact_uuid",
  });

export const searchContactInFunnelsTool: ToolDefinition<typeof schema> = {
  name: "search_contact_in_funnels",
  description: "Busca un contacto dentro de los embudos por número de teléfono o por contact_uuid. Devuelve en qué embudo y etapa está.",
  schema,
  handler: async ({ phone_number, contact_uuid }) => {
    const client = getClient();
    return await (client.funnels as any).searchContact({
      phoneNumber: phone_number,
      contactUuid: contact_uuid,
    });
  },
};
```

```ts
// src/tools/funnels/move-contact.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  funnel_contact_id: z.number().int().positive(),
  to_stage_id: z.number().int().positive(),
});

export const moveContactToFunnelStageTool: ToolDefinition<typeof schema> = {
  name: "move_contact_to_funnel_stage",
  description: "Mueve un contacto a otra etapa de un embudo. Usa search_contact_in_funnels para obtener el funnel_contact_id y list_funnels para los IDs de etapa.",
  schema,
  handler: async ({ funnel_contact_id, to_stage_id }) => {
    const client = getClient();
    return await (client.funnels as any).moveContactToFunnel({
      funnelContactId: funnel_contact_id,
      toStageId: to_stage_id,
    });
  },
};
```

- [ ] **Step 4: Register the 3 tools in `src/tools/index.ts`**

Add imports and append `listFunnelsTool, searchContactInFunnelsTool, moveContactToFunnelStageTool` to `allTools` (after the campaigns tools).

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (175 tests: 171 + 4).

- [ ] **Step 6: Commit**

```bash
git add src/tools/funnels/ src/tools/index.ts tests/unit/tools/funnels.test.ts
git commit -m "feat(tools): módulo de funnels — list/search/move (3 tools)"
```

---

## Task 2: Metrics — general (7 tools)

**Files:**
- Create: `src/tools/metrics/online-agents.ts`, `src/tools/metrics/status-contacts.ts`, `src/tools/metrics/total-campaigns.ts`, `src/tools/metrics/consolidated-conversations.ts`, `src/tools/metrics/agent-conversations.ts`, `src/tools/metrics/messages.ts`, `src/tools/metrics/messages-bot.ts`
- Create: `src/tools/metrics/date-range.ts` (shared schema fragment)
- Create: `tests/unit/tools/metrics-general.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/metrics-general.test.ts
import { describe, it, expect, vi } from "vitest";
import { getOnlineAgentsTool } from "../../../src/tools/metrics/online-agents.js";
import { getStatusContactsTool } from "../../../src/tools/metrics/status-contacts.js";
import { getTotalCampaignsTool } from "../../../src/tools/metrics/total-campaigns.js";
import { getConsolidatedConversationsTool } from "../../../src/tools/metrics/consolidated-conversations.js";
import { getAgentConversationsTool } from "../../../src/tools/metrics/agent-conversations.js";
import { getMessagesTool } from "../../../src/tools/metrics/messages.js";
import { getMessagesBotTool } from "../../../src/tools/metrics/messages-bot.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getOnlineAgents: vi.fn().mockResolvedValue({ data: [] }),
  getStatusContacts: vi.fn().mockResolvedValue({ data: {} }),
  getTotalCampaigns: vi.fn().mockResolvedValue({ data: {} }),
  getConsolidatedConversations: vi.fn().mockResolvedValue({ data: {} }),
  getAgentConversations: vi.fn().mockResolvedValue({ data: [] }),
  getMessages: vi.fn().mockResolvedValue({ data: {} }),
  getMessagesBot: vi.fn().mockResolvedValue({ data: {} }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ metrics: mocks }),
}));

describe("metrics — no-date tools", () => {
  it("get_online_agents takes no args", async () => {
    const h = wrapHandler(getOnlineAgentsTool.schema, getOnlineAgentsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getOnlineAgents).toHaveBeenCalled();
  });
  it("get_status_contacts takes no args", async () => {
    const h = wrapHandler(getStatusContactsTool.schema, getStatusContactsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getStatusContacts).toHaveBeenCalled();
  });
});

describe("metrics — date-range tools", () => {
  const cases: [string, any, any][] = [
    ["get_total_campaigns", getTotalCampaignsTool, mocks.getTotalCampaigns],
    ["get_consolidated_conversations", getConsolidatedConversationsTool, mocks.getConsolidatedConversations],
    ["get_agent_conversations", getAgentConversationsTool, mocks.getAgentConversations],
    ["get_messages", getMessagesTool, mocks.getMessages],
    ["get_messages_bot", getMessagesBotTool, mocks.getMessagesBot],
  ];

  for (const [name, tool, mock] of cases) {
    it(`${name} maps snake_case dates to camelCase`, async () => {
      const h = wrapHandler(tool.schema, tool.handler);
      await h({ start_date: "2026-01-01", end_date: "2026-01-31" });
      expect(mock).toHaveBeenCalledWith({ startDate: "2026-01-01", endDate: "2026-01-31" });
    });

    it(`${name} requires both dates`, async () => {
      const h = wrapHandler(tool.schema, tool.handler);
      expect((await h({ start_date: "2026-01-01" })).isError).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement shared date-range schema + the 7 tools**

```ts
// src/tools/metrics/date-range.ts
import { z } from "zod";

export const dateRangeSchema = z.object({
  start_date: z.string().min(1).describe("Fecha inicial del rango, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final del rango, formato YYYY-MM-DD"),
});

export type DateRange = z.infer<typeof dateRangeSchema>;

export const toSdkDates = (a: DateRange) => ({ startDate: a.start_date, endDate: a.end_date });
```

```ts
// src/tools/metrics/online-agents.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const getOnlineAgentsTool: ToolDefinition<typeof schema> = {
  name: "get_online_agents",
  description: "Métrica: lista de agentes actualmente en línea.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.metrics as any).getOnlineAgents();
  },
};
```

```ts
// src/tools/metrics/status-contacts.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const getStatusContactsTool: ToolDefinition<typeof schema> = {
  name: "get_status_contacts",
  description: "Métrica: conteo de contactos por estado de conversación.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.metrics as any).getStatusContacts();
  },
};
```

```ts
// src/tools/metrics/total-campaigns.ts
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getTotalCampaignsTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_total_campaigns",
  description: "Métrica: total de campañas en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getTotalCampaigns(toSdkDates(args));
  },
};
```

```ts
// src/tools/metrics/consolidated-conversations.ts
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getConsolidatedConversationsTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_consolidated_conversations",
  description: "Métrica: conversaciones consolidadas en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getConsolidatedConversations(toSdkDates(args));
  },
};
```

```ts
// src/tools/metrics/agent-conversations.ts
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getAgentConversationsTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_agent_conversations",
  description: "Métrica: conversaciones por agente en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getAgentConversations(toSdkDates(args));
  },
};
```

```ts
// src/tools/metrics/messages.ts
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getMessagesTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_messages",
  description: "Métrica: volumen de mensajes en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getMessages(toSdkDates(args));
  },
};
```

```ts
// src/tools/metrics/messages-bot.ts
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { dateRangeSchema, toSdkDates } from "./date-range.js";

export const getMessagesBotTool: ToolDefinition<typeof dateRangeSchema> = {
  name: "get_messages_bot",
  description: "Métrica: volumen de mensajes enviados por el bot en un rango de fechas (YYYY-MM-DD).",
  schema: dateRangeSchema,
  handler: async (args) => {
    const client = getClient();
    return await (client.metrics as any).getMessagesBot(toSdkDates(args));
  },
};
```

- [ ] **Step 4: Register the 7 tools in `src/tools/index.ts`**

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (~187 tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/metrics/ src/tools/index.ts tests/unit/tools/metrics-general.test.ts
git commit -m "feat(tools): métricas generales — agentes, contactos, campañas, conversaciones, mensajes (7 tools)"
```

---

## Task 3: Metrics — per-agent (4 tools)

**Files:**
- Create: `src/tools/metrics/agent-time-response.ts`, `src/tools/metrics/agent-transferred.ts`, `src/tools/metrics/agent-volume-of-work.ts`, `src/tools/metrics/agent-time-in-conversation.ts`
- Create: `tests/unit/tools/metrics-agent.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/metrics-agent.test.ts
import { describe, it, expect, vi } from "vitest";
import { getAgentTimeResponseTool } from "../../../src/tools/metrics/agent-time-response.js";
import { getAgentTransferredTool } from "../../../src/tools/metrics/agent-transferred.js";
import { getAgentVolumeOfWorkTool } from "../../../src/tools/metrics/agent-volume-of-work.js";
import { getAgentTimeInConversationTool } from "../../../src/tools/metrics/agent-time-in-conversation.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAgentTimeResponse: vi.fn().mockResolvedValue({ data: {} }),
  getAgentTransferred: vi.fn().mockResolvedValue({ data: {} }),
  getAgentVolumeOfWork: vi.fn().mockResolvedValue({ data: {} }),
  getAgentTimeInConversation: vi.fn().mockResolvedValue({ data: {} }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ metrics: mocks }),
}));

describe("metrics — per-agent tools", () => {
  const cases: [string, any, any][] = [
    ["get_agent_time_response", getAgentTimeResponseTool, mocks.getAgentTimeResponse],
    ["get_agent_transferred", getAgentTransferredTool, mocks.getAgentTransferred],
    ["get_agent_volume_of_work", getAgentVolumeOfWorkTool, mocks.getAgentVolumeOfWork],
    ["get_agent_time_in_conversation", getAgentTimeInConversationTool, mocks.getAgentTimeInConversation],
  ];

  for (const [name, tool, mock] of cases) {
    it(`${name} maps agent_id + dates to camelCase`, async () => {
      const h = wrapHandler(tool.schema, tool.handler);
      await h({ agent_id: 42, start_date: "2026-01-01", end_date: "2026-01-31" });
      expect(mock).toHaveBeenCalledWith({ agentId: 42, startDate: "2026-01-01", endDate: "2026-01-31" });
    });

    it(`${name} requires agent_id`, async () => {
      const h = wrapHandler(tool.schema, tool.handler);
      expect((await h({ start_date: "2026-01-01", end_date: "2026-01-31" })).isError).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement the 4 tools**

Each follows this shape (shown for `agent-time-response.ts`; repeat for the other three changing name/description/SDK method):

```ts
// src/tools/metrics/agent-time-response.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  agent_id: z.number().int().positive(),
  start_date: z.string().min(1).describe("Fecha inicial, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final, formato YYYY-MM-DD"),
});

export const getAgentTimeResponseTool: ToolDefinition<typeof schema> = {
  name: "get_agent_time_response",
  description: "Métrica de un agente: tiempo de respuesta en un rango de fechas.",
  schema,
  handler: async ({ agent_id, start_date, end_date }) => {
    const client = getClient();
    return await (client.metrics as any).getAgentTimeResponse({
      agentId: agent_id,
      startDate: start_date,
      endDate: end_date,
    });
  },
};
```

For the other three:
- `agent-transferred.ts` → `getAgentTransferredTool`, name `get_agent_transferred`, SDK `getAgentTransferred`, desc "Métrica de un agente: conversaciones transferidas en un rango de fechas."
- `agent-volume-of-work.ts` → `getAgentVolumeOfWorkTool`, name `get_agent_volume_of_work`, SDK `getAgentVolumeOfWork`, desc "Métrica de un agente: volumen de trabajo en un rango de fechas."
- `agent-time-in-conversation.ts` → `getAgentTimeInConversationTool`, name `get_agent_time_in_conversation`, SDK `getAgentTimeInConversation`, desc "Métrica de un agente: tiempo en conversación en un rango de fechas."

- [ ] **Step 4: Register the 4 tools in `src/tools/index.ts`**

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (~195 tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/metrics/ src/tools/index.ts tests/unit/tools/metrics-agent.test.ts
git commit -m "feat(tools): métricas por agente — tiempo respuesta, transferencias, volumen, tiempo en conversación (4 tools)"
```

---

## Task 4: Manifest (43), contract tests, README

**Files:**
- Modify: `scripts/generate-manifest.mjs`, `tests/unit/generate-manifest.test.ts`, `tests/contracts/sdk-shapes.test.ts`, `README.md`

- [ ] **Step 1: Update manifest test first**

In `tests/unit/generate-manifest.test.ts`, rename the test to `declares all 43 tools` and append the 14 new names after `get_campaign`, in this order:

```
"list_funnels", "search_contact_in_funnels", "move_contact_to_funnel_stage",
"get_online_agents", "get_status_contacts", "get_total_campaigns",
"get_consolidated_conversations", "get_agent_conversations", "get_messages",
"get_messages_bot", "get_agent_time_response", "get_agent_transferred",
"get_agent_volume_of_work", "get_agent_time_in_conversation",
```

- [ ] **Step 2: Run, expect failure. Append 14 entries to `TOOLS` in `scripts/generate-manifest.mjs`**

```js
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
```

- [ ] **Step 3: Extend `tests/contracts/sdk-shapes.test.ts`**

Add a `describe("SDK shape contracts — funnels", ...)` with `getAll`, `searchContact`, `moveContactToFunnel`, and a `describe("SDK shape contracts — metrics", ...)` with all 11 public metrics methods, each `expectTypeOf<WasapiClient["funnels"|"metrics"]["method"]>().toBeFunction()`.

- [ ] **Step 4: Update README**

In "## Herramientas disponibles": change total to **43 herramientas en total.** and add two groups after Campañas:

```markdown
### Funnels (3)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_funnels` | Lista los embudos de venta y sus etapas | — |
| `search_contact_in_funnels` | Busca un contacto en los embudos | `phone_number` o `contact_uuid` |
| `move_contact_to_funnel_stage` | Mueve un contacto a otra etapa | `funnel_contact_id`, `to_stage_id` |

### Métricas (11)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `get_online_agents` | Agentes en línea | — |
| `get_status_contacts` | Contactos por estado | — |
| `get_total_campaigns` | Total de campañas en un rango | `start_date`, `end_date` |
| `get_consolidated_conversations` | Conversaciones consolidadas | `start_date`, `end_date` |
| `get_agent_conversations` | Conversaciones por agente | `start_date`, `end_date` |
| `get_messages` | Volumen de mensajes | `start_date`, `end_date` |
| `get_messages_bot` | Mensajes del bot | `start_date`, `end_date` |
| `get_agent_time_response` | Tiempo de respuesta de un agente | `agent_id`, `start_date`, `end_date` |
| `get_agent_transferred` | Conversaciones transferidas de un agente | `agent_id`, `start_date`, `end_date` |
| `get_agent_volume_of_work` | Volumen de trabajo de un agente | `agent_id`, `start_date`, `end_date` |
| `get_agent_time_in_conversation` | Tiempo en conversación de un agente | `agent_id`, `start_date`, `end_date` |

Las métricas con rango de fechas esperan formato `YYYY-MM-DD`.
```

Also update the "¿Qué puedo hacer?" examples count line from 29 to 43, and add 1 example:
> *"¿Cuántos mensajes enviamos entre el 1 y el 31 de enero? ¿Y cuántos agentes están en línea ahora?"*

- [ ] **Step 5: Full verification**

```bash
npm test && npm run typecheck && npm run build
npm pack --dry-run | grep -cE "(DS_Store|src/|tests/)"   # expect 0
```
Expected: ~195 tests green, typecheck clean, build clean, 0 leak.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-manifest.mjs tests/ README.md
git commit -m "feat(dxt): manifest 43 tools + contract tests + README (funnels, métricas)"
```

---

## Task 5: Release v0.6.0

**Files:** operational only.

- [ ] **Step 1: Confirm clean tree, bump, push (controller does this; publish is the user's)**

```bash
git status
npm version minor          # 0.5.0 → 0.6.0
git push --follow-tags
```

- [ ] **Step 2: User publishes to npm**

```bash
npm publish --access public --otp=<código>
```

- [ ] **Step 3: Build MCPB**

```bash
npm run package:dxt
unzip -p release/wasapi-mcp-0.6.0.mcpb manifest.json | python3 -c "import json,sys; m=json.load(sys.stdin); print(m['version'], len(m['tools']))"
# expect: 0.6.0 43
cp release/wasapi-mcp-0.6.0.mcpb ~/Desktop/wasapi-mcp.mcpb
```

- [ ] **Step 4: Manual smoke**

Reinstall the `.mcpb` in Claude Desktop, enable it, and against the real account test: `list_funnels`, `get_online_agents`, and `get_messages` with a date range (to confirm the date format). Document the confirmed date format and any observed response shapes in `docs/sdk-surface.md`.

- [ ] **Step 5: GitHub release**

```bash
gh release create v0.6.0 release/wasapi-mcp-0.6.0.mcpb release/wasapi-mcp.mcpb \
  --title "v0.6.0 — Funnels y Métricas: 43 herramientas" \
  --notes "14 herramientas nuevas: embudos de venta (3) y panel de métricas (11 — agentes, contactos, campañas, conversaciones, mensajes y métricas por agente)."
```
