# Conversations + Labels + Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the 3 new SDK 2.0.0 modules (`conversations`, `labels`, `reports`) to the MCP — 11 tools, taking it from 51 to 62, and close the historical `list_conversations` gap.

**Architecture:** Identical to existing pattern — one file per tool exporting `{name, description, schema, handler}`, zod via `wrapHandler`, singleton client from `src/wasapi.ts`. Tool params snake_case; handler maps to SDK shape. Handlers use `(client.<module> as any).method(...)`. NO `resolveFromId` in reports (from_id there is an optional filter, not a sender).

**Tech Stack:** TypeScript, zod v3, vitest. SDK already bumped to `^2.0.0` (verified typecheck + 230 tests pass; constructor unchanged).

**Spec:** `docs/superpowers/specs/2026-06-16-conversations-labels-reports-design.md`

**SDK ground truth (verified, mounts as `client.conversations` / `client.labels` / `client.reports`):**
- `conversations.getAll(params?: GetConversationsParams)`, `conversations.getNextPage(cursor: string, params?: Omit<GetConversationsParams,'cursor'>)`
- `labels.getAll()`, `getSearch(name)`, `getById(id)`, `create({ title, description?, color })`, `update({ id, data: { title, description?, color } })`, `delete(id)`
- `reports.getPerformanceByAgent({ start_date, end_date, agent_id? })`, `getVolumeOfWorkflow({ start_date, end_date, from_id? })`, `getSatisfactionSurvey({ start_date, end_date, agent_id? })`

`GetConversationsParams` fields (all optional): `query`, `search_type` ('contactName'|'all'), `status` ('open'|'hold'|'closed'), `phones`, `labels`, `agents`, `dates`, `without_labels` (boolean), `open_options` ('0'|'1'|'2'|'3'), `order_conversations` ('0'|'1'), `all_agents` (boolean), `cursor`, `per_page` (number).

**Test mock convention:** `vi.mock("../../../src/wasapi.js", () => ({ getClient: () => ({ <module>: mocks }) }))`; assert exact args via `wrapHandler(tool.schema, tool.handler)`.

---

## Task 1: conversations — 2 tools

**Files:**
- Create: `src/tools/conversations/filters.ts` (shared optional-filters zod fragment), `src/tools/conversations/list.ts`, `src/tools/conversations/next-page.ts`
- Create: `tests/unit/tools/conversations.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/conversations.test.ts
import { describe, it, expect, vi } from "vitest";
import { listConversationsTool } from "../../../src/tools/conversations/list.js";
import { getConversationsNextPageTool } from "../../../src/tools/conversations/next-page.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ data: [], next_cursor: "abc" }),
  getNextPage: vi.fn().mockResolvedValue({ data: [] }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ conversations: mocks }),
}));

describe("list_conversations", () => {
  it("works with no args", async () => {
    const h = wrapHandler(listConversationsTool.schema, listConversationsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalledWith({});
  });

  it("passes filters through unchanged", async () => {
    const h = wrapHandler(listConversationsTool.schema, listConversationsTool.handler);
    await h({ status: "open", query: "ana", per_page: 20 });
    expect(mocks.getAll).toHaveBeenCalledWith({ status: "open", query: "ana", per_page: 20 });
  });

  it("rejects invalid status enum", async () => {
    const h = wrapHandler(listConversationsTool.schema, listConversationsTool.handler);
    expect((await h({ status: "archived" })).isError).toBe(true);
  });
});

describe("get_conversations_next_page", () => {
  it("requires cursor and passes it positionally with filters", async () => {
    const h = wrapHandler(getConversationsNextPageTool.schema, getConversationsNextPageTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ cursor: "abc", status: "closed" });
    expect(mocks.getNextPage).toHaveBeenCalledWith("abc", { status: "closed" });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/tools/conversations.test.ts`

- [ ] **Step 3: Implement shared filters + the 2 tools**

```ts
// src/tools/conversations/filters.ts
import { z } from "zod";

// All optional filters shared by list_conversations and get_conversations_next_page.
export const conversationFilters = {
  query: z.string().optional(),
  search_type: z.enum(["contactName", "all"]).optional(),
  status: z.enum(["open", "hold", "closed"]).optional(),
  phones: z.string().optional().describe("IDs/teléfonos separados por coma"),
  labels: z.string().optional().describe("IDs de etiquetas separados por coma"),
  agents: z.string().optional().describe("IDs de agentes separados por coma"),
  dates: z.string().optional().describe("Rango de fechas YYYY-MM-DD,YYYY-MM-DD"),
  without_labels: z.boolean().optional(),
  open_options: z.enum(["0", "1", "2", "3"]).optional(),
  order_conversations: z.enum(["0", "1"]).optional(),
  all_agents: z.boolean().optional(),
  per_page: z.number().int().positive().max(200).optional(),
} as const;
```

```ts
// src/tools/conversations/list.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { conversationFilters } from "./filters.js";

const schema = z.object({
  ...conversationFilters,
  cursor: z.string().optional().describe("Cursor de paginación; normalmente usa get_conversations_next_page"),
});

export const listConversationsTool: ToolDefinition<typeof schema> = {
  name: "list_conversations",
  description: "Lista las conversaciones de la cuenta (paginado por cursor) con filtros opcionales por estado, texto, teléfonos, etiquetas, agentes y fechas. Distinto de get_conversation, que trae el hilo de mensajes con un contacto puntual.",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await (client.conversations as any).getAll(args);
  },
};
```

```ts
// src/tools/conversations/next-page.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { conversationFilters } from "./filters.js";

const schema = z.object({
  cursor: z.string().min(1),
  ...conversationFilters,
});

export const getConversationsNextPageTool: ToolDefinition<typeof schema> = {
  name: "get_conversations_next_page",
  description: "Obtiene la siguiente página de conversaciones usando el cursor devuelto por list_conversations.",
  schema,
  handler: async ({ cursor, ...rest }) => {
    const client = getClient();
    return await (client.conversations as any).getNextPage(cursor, rest);
  },
};
```

- [ ] **Step 4: Register both in `src/tools/index.ts`**

Add imports and append `listConversationsTool, getConversationsNextPageTool` after the user tool.

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (234 tests: 230 + 4).

- [ ] **Step 6: Commit**

```bash
git add src/tools/conversations/ src/tools/index.ts tests/unit/tools/conversations.test.ts
git commit -m "feat(tools): módulo conversations — list_conversations + next_page (cierra gap histórico)"
```

---

## Task 2: labels — 6 tools

**Files:**
- Create: `src/tools/labels/list.ts`, `search.ts`, `get.ts`, `create.ts`, `update.ts`, `delete.ts`
- Create: `tests/unit/tools/labels.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/labels.test.ts
import { describe, it, expect, vi } from "vitest";
import { listLabelsTool } from "../../../src/tools/labels/list.js";
import { searchLabelsTool } from "../../../src/tools/labels/search.js";
import { getLabelTool } from "../../../src/tools/labels/get.js";
import { createLabelTool } from "../../../src/tools/labels/create.js";
import { updateLabelTool } from "../../../src/tools/labels/update.js";
import { deleteLabelTool } from "../../../src/tools/labels/delete.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getSearch: vi.fn().mockResolvedValue({ success: true, data: {} }),
  getById: vi.fn().mockResolvedValue({ success: true, data: { id: "l1" } }),
  create: vi.fn().mockResolvedValue({ success: true, data: { id: "l2" } }),
  update: vi.fn().mockResolvedValue({ success: true, data: { id: "l1" } }),
  delete: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ labels: mocks }),
}));

describe("labels tools", () => {
  it("list_labels takes no args", async () => {
    const h = wrapHandler(listLabelsTool.schema, listLabelsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalled();
  });

  it("search_labels passes name positionally", async () => {
    const h = wrapHandler(searchLabelsTool.schema, searchLabelsTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ name: "VIP" });
    expect(mocks.getSearch).toHaveBeenCalledWith("VIP");
  });

  it("get_label passes label_id positionally", async () => {
    const h = wrapHandler(getLabelTool.schema, getLabelTool.handler);
    await h({ label_id: "l1" });
    expect(mocks.getById).toHaveBeenCalledWith("l1");
  });

  it("create_label maps title/color/description", async () => {
    const h = wrapHandler(createLabelTool.schema, createLabelTool.handler);
    expect((await h({ title: "X" })).isError).toBe(true); // color required
    await h({ title: "VIP", color: "#ff0000", description: "Clientes top" });
    expect(mocks.create).toHaveBeenCalledWith({ title: "VIP", color: "#ff0000", description: "Clientes top" });
  });

  it("update_label maps to { id, data }", async () => {
    const h = wrapHandler(updateLabelTool.schema, updateLabelTool.handler);
    await h({ label_id: "l1", title: "VIP", color: "#00ff00" });
    expect(mocks.update).toHaveBeenCalledWith({ id: "l1", data: { title: "VIP", color: "#00ff00", description: undefined } });
  });

  it("delete_label passes label_id positionally", async () => {
    const h = wrapHandler(deleteLabelTool.schema, deleteLabelTool.handler);
    await h({ label_id: "l1" });
    expect(mocks.delete).toHaveBeenCalledWith("l1");
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement the 6 tools**

```ts
// src/tools/labels/list.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listLabelsTool: ToolDefinition<typeof schema> = {
  name: "list_labels",
  description: "Lista todas las etiquetas (labels) de la cuenta.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.labels as any).getAll();
  },
};
```

```ts
// src/tools/labels/search.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ name: z.string().min(1) });

export const searchLabelsTool: ToolDefinition<typeof schema> = {
  name: "search_labels",
  description: "Busca etiquetas por nombre.",
  schema,
  handler: async ({ name }) => {
    const client = getClient();
    return await (client.labels as any).getSearch(name);
  },
};
```

```ts
// src/tools/labels/get.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ label_id: z.string().min(1) });

export const getLabelTool: ToolDefinition<typeof schema> = {
  name: "get_label",
  description: "Obtiene una etiqueta por su ID.",
  schema,
  handler: async ({ label_id }) => {
    const client = getClient();
    return await (client.labels as any).getById(label_id);
  },
};
```

```ts
// src/tools/labels/create.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  title: z.string().min(1),
  color: z.string().min(1).describe("Color en hex, p.ej. #ff0000"),
  description: z.string().optional(),
});

export const createLabelTool: ToolDefinition<typeof schema> = {
  name: "create_label",
  description: "Crea una etiqueta nueva con título, color y descripción opcional.",
  schema,
  handler: async ({ title, color, description }) => {
    const client = getClient();
    return await (client.labels as any).create({ title, color, description });
  },
};
```

```ts
// src/tools/labels/update.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  label_id: z.string().min(1),
  title: z.string().min(1),
  color: z.string().min(1),
  description: z.string().optional(),
});

export const updateLabelTool: ToolDefinition<typeof schema> = {
  name: "update_label",
  description: "Actualiza una etiqueta existente (título, color, descripción).",
  schema,
  handler: async ({ label_id, title, color, description }) => {
    const client = getClient();
    return await (client.labels as any).update({ id: label_id, data: { title, color, description } });
  },
};
```

```ts
// src/tools/labels/delete.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ label_id: z.string().min(1) });

export const deleteLabelTool: ToolDefinition<typeof schema> = {
  name: "delete_label",
  description: "Elimina una etiqueta por su ID. Operación irreversible.",
  schema,
  handler: async ({ label_id }) => {
    const client = getClient();
    return await (client.labels as any).delete(label_id);
  },
};
```

- [ ] **Step 4: Register the 6 tools in `src/tools/index.ts`**

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (~240 tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/labels/ src/tools/index.ts tests/unit/tools/labels.test.ts
git commit -m "feat(tools): módulo labels — CRUD de etiquetas (6 tools)"
```

---

## Task 3: reports — 3 tools

**Files:**
- Create: `src/tools/reports/agent-performance.ts`, `workflow-volume.ts`, `satisfaction-survey.ts`
- Create: `tests/unit/tools/reports.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/reports.test.ts
import { describe, it, expect, vi } from "vitest";
import { getAgentPerformanceReportTool } from "../../../src/tools/reports/agent-performance.js";
import { getWorkflowVolumeReportTool } from "../../../src/tools/reports/workflow-volume.js";
import { getSatisfactionSurveyReportTool } from "../../../src/tools/reports/satisfaction-survey.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getPerformanceByAgent: vi.fn().mockResolvedValue({ data: {} }),
  getVolumeOfWorkflow: vi.fn().mockResolvedValue({ data: {} }),
  getSatisfactionSurvey: vi.fn().mockResolvedValue({ data: {} }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ reports: mocks }),
}));

describe("reports tools", () => {
  it("agent_performance requires dates, includes agent_id when given", async () => {
    const h = wrapHandler(getAgentPerformanceReportTool.schema, getAgentPerformanceReportTool.handler);
    expect((await h({ start_date: "2026-01-01" })).isError).toBe(true);
    await h({ start_date: "2026-01-01", end_date: "2026-01-31", agent_id: 7 });
    expect(mocks.getPerformanceByAgent).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31", agent_id: 7 });
  });

  it("agent_performance omits agent_id when not given", async () => {
    const h = wrapHandler(getAgentPerformanceReportTool.schema, getAgentPerformanceReportTool.handler);
    await h({ start_date: "2026-01-01", end_date: "2026-01-31" });
    expect(mocks.getPerformanceByAgent).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31", agent_id: undefined });
  });

  it("workflow_volume maps from_id filter", async () => {
    const h = wrapHandler(getWorkflowVolumeReportTool.schema, getWorkflowVolumeReportTool.handler);
    await h({ start_date: "2026-01-01", end_date: "2026-01-31", from_id: 5 });
    expect(mocks.getVolumeOfWorkflow).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31", from_id: 5 });
  });

  it("satisfaction_survey requires dates", async () => {
    const h = wrapHandler(getSatisfactionSurveyReportTool.schema, getSatisfactionSurveyReportTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ start_date: "2026-01-01", end_date: "2026-01-31" });
    expect(mocks.getSatisfactionSurvey).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31", agent_id: undefined });
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement the 3 tools**

```ts
// src/tools/reports/agent-performance.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  start_date: z.string().min(1).describe("Fecha inicial, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final, formato YYYY-MM-DD"),
  agent_id: z.number().int().positive().optional().describe("Filtra por agente; si se omite, cubre todos"),
});

export const getAgentPerformanceReportTool: ToolDefinition<typeof schema> = {
  name: "get_agent_performance_report",
  description: "Reporte de desempeño por agente en un rango de fechas. agent_id es un filtro opcional.",
  schema,
  handler: async ({ start_date, end_date, agent_id }) => {
    const client = getClient();
    return await (client.reports as any).getPerformanceByAgent({ start_date, end_date, agent_id });
  },
};
```

```ts
// src/tools/reports/workflow-volume.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  start_date: z.string().min(1).describe("Fecha inicial, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final, formato YYYY-MM-DD"),
  from_id: z.number().int().positive().optional().describe("Filtra por número de WhatsApp; si se omite, cubre todos"),
});

export const getWorkflowVolumeReportTool: ToolDefinition<typeof schema> = {
  name: "get_workflow_volume_report",
  description: "Reporte de volumen de workflow en un rango de fechas. from_id es un filtro opcional por número.",
  schema,
  handler: async ({ start_date, end_date, from_id }) => {
    const client = getClient();
    return await (client.reports as any).getVolumeOfWorkflow({ start_date, end_date, from_id });
  },
};
```

```ts
// src/tools/reports/satisfaction-survey.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  start_date: z.string().min(1).describe("Fecha inicial, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final, formato YYYY-MM-DD"),
  agent_id: z.number().int().positive().optional().describe("Filtra por agente; si se omite, cubre todos"),
});

export const getSatisfactionSurveyReportTool: ToolDefinition<typeof schema> = {
  name: "get_satisfaction_survey_report",
  description: "Reporte de encuestas de satisfacción en un rango de fechas. agent_id es un filtro opcional.",
  schema,
  handler: async ({ start_date, end_date, agent_id }) => {
    const client = getClient();
    return await (client.reports as any).getSatisfactionSurvey({ start_date, end_date, agent_id });
  },
};
```

- [ ] **Step 4: Register the 3 tools in `src/tools/index.ts`**

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (~244 tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/reports/ src/tools/index.ts tests/unit/tools/reports.test.ts
git commit -m "feat(tools): módulo reports — desempeño, volumen workflow, satisfacción (3 tools)"
```

---

## Task 4: Manifest (62), contract tests, README, close gap

**Files:**
- Modify: `scripts/generate-manifest.mjs`, `tests/unit/generate-manifest.test.ts`, `tests/contracts/sdk-shapes.test.ts`, `README.md`, `docs/sdk-surface.md`

- [ ] **Step 1: Update manifest test first**

In `tests/unit/generate-manifest.test.ts`, rename to `declares all 62 tools` and append the 11 new names after `get_current_user`, in this order:

```
"list_conversations", "get_conversations_next_page",
"list_labels", "search_labels", "get_label",
"create_label", "update_label", "delete_label",
"get_agent_performance_report", "get_workflow_volume_report", "get_satisfaction_survey_report",
```

- [ ] **Step 2: Run, expect failure. Append 11 entries to `TOOLS` in `scripts/generate-manifest.mjs`**

```js
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
```

- [ ] **Step 3: Extend `tests/contracts/sdk-shapes.test.ts`**

Add `describe` blocks for the 3 modules: `conversations.getAll/getNextPage`; `labels.getAll/getSearch/getById/create/update/delete`; `reports.getPerformanceByAgent/getVolumeOfWorkflow/getSatisfactionSurvey`. Each `expectTypeOf<WasapiClient["<module>"]["method"]>().toBeFunction()`.

- [ ] **Step 4: Update README**

In "## Herramientas disponibles": change total to **62 herramientas en total.** and add three groups after Usuario:

```markdown
### Conversaciones (2)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_conversations` | Lista conversaciones (paginado por cursor) con filtros | `status`, `query`, `phones`, `labels`, `agents`, `dates`, `per_page` (todos opcionales) |
| `get_conversations_next_page` | Siguiente página vía cursor | `cursor` + mismos filtros |

### Etiquetas (6)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_labels` | Lista las etiquetas | — |
| `search_labels` | Busca etiquetas por nombre | `name` |
| `get_label` | Obtiene una etiqueta por ID | `label_id` |
| `create_label` | Crea una etiqueta | `title`, `color`, `description` (opcional) |
| `update_label` | Actualiza una etiqueta | `label_id`, `title`, `color`, `description` (opcional) |
| `delete_label` | Elimina una etiqueta | `label_id` |

### Reportes (3)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `get_agent_performance_report` | Desempeño por agente en un rango | `start_date`, `end_date`, `agent_id` (opcional) |
| `get_workflow_volume_report` | Volumen de workflow en un rango | `start_date`, `end_date`, `from_id` (opcional) |
| `get_satisfaction_survey_report` | Encuestas de satisfacción en un rango | `start_date`, `end_date`, `agent_id` (opcional) |
```

Update the "Claude decide cuál de las 51 herramientas usar" line to **62**, and add an example to "¿Qué puedo hacer?":
> *"Muéstrame las conversaciones abiertas sin etiqueta y dame el reporte de satisfacción del último mes."*

In "## Limitaciones conocidas", **remove** the `list_conversations` row (now implemented).

- [ ] **Step 5: Update `docs/sdk-surface.md`**

Replace the "### `listConversations` does not exist" section with a note that conversations module now provides it (`conversations.getAll` / `getNextPage`), and add the surface tables for the `conversations`, `labels`, and `reports` modules (methods + params), plus note the SDK is now at 2.0.0.

- [ ] **Step 6: Full verification**

```bash
npm test && npm run typecheck && npm run build
npm pack --dry-run | grep -cE "(DS_Store|src/|tests/)"   # expect 0
```
Expected: ~250 tests green, typecheck clean, build clean, 0 leak.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-manifest.mjs tests/ README.md docs/sdk-surface.md
git commit -m "feat(dxt): manifest 62 tools + contract tests + README/sdk-surface (conversations, labels, reports); cierra gap list_conversations"
```

---

## Task 5: Release v0.8.0

**Files:** operational only.

- [ ] **Step 1: Confirm clean tree, bump, push (controller does this; publish is the user's)**

```bash
git status
npm version minor          # 0.7.0 → 0.8.0
git push --follow-tags
```

- [ ] **Step 2: User publishes to npm**

```bash
npm publish --access public --otp=<código>
```

- [ ] **Step 3: Build MCPB**

```bash
npm run package:dxt
unzip -p release/wasapi-mcp-0.8.0.mcpb manifest.json | python3 -c "import json,sys; m=json.load(sys.stdin); print(m['version'], len(m['tools']))"
# expect: 0.8.0 62
cp release/wasapi-mcp-0.8.0.mcpb ~/Desktop/wasapi-mcp.mcpb
```

- [ ] **Step 4: Manual smoke**

Reinstall the `.mcpb`, enable it, and against the real account test: `list_conversations` (headline — confirm it returns conversations and note the cursor field), `list_labels`, and `get_agent_performance_report` with a date range. Document the cursor field name + observed shapes in `docs/sdk-surface.md`.

- [ ] **Step 5: GitHub release**

```bash
gh release create v0.8.0 release/wasapi-mcp-0.8.0.mcpb release/wasapi-mcp.mcpb \
  --title "v0.8.0 — Conversaciones, Etiquetas y Reportes: 62 herramientas" \
  --notes "Soporte para el SDK 2.0.0: nuevos módulos de conversaciones (incl. el esperado list_conversations), CRUD de etiquetas y reportes (desempeño por agente, volumen de workflow, satisfacción)."
```
