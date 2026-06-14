# Bot + Workflow + CustomFields + User Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the last 4 SDK modules (`bot`, `workflow`, `customFields`, `user`) to the MCP — 8 tools, taking it from 43 to 51.

**Architecture:** Identical to existing pattern — one file per tool exporting `{name, description, schema, handler}`, zod via `wrapHandler`, singleton client from `src/wasapi.ts`. Tool params snake_case; handler maps to the SDK shape. `bot` uses `resolveFromId` fallback for `from_id`. Handlers use `(client.<module> as any).method(...)`.

**Tech Stack:** TypeScript, zod v3, vitest. No new deps.

**Spec:** `docs/superpowers/specs/2026-06-14-bot-workflow-customfields-user-design.md`

**SDK ground truth (verified):** modules attach as `client.bot`, `client.workflow`, `client.customFields`, `client.user`. Signatures:
- `bot.toggleStatus({ wa_id, data: { from_id, action } })` where action ∈ enable|disable|disable_permanently
- `workflow.getStatuses({ action?, phone?, agent_id?, dates?, per_page?, page? })` — note SDK uses snake_case here (`agent_id`, `per_page`); pass through unchanged
- `customFields.getAll()`, `getById(id)`, `create({ name })`, `update({ id, data: { name } })`, `delete(id)`
- `user.getUser()`

**Test mock convention:** `vi.mock("../../../src/wasapi.js", () => ({ getClient: () => ({ <module>: mocks }) }))`; assert exact args to the SDK mock via `wrapHandler(tool.schema, tool.handler)`. The `bot` test needs `process.env.WASAPI_API_KEY = "test"` and `WASAPI_FROM_ID` set for the fallback path (see existing `whatsapp-send-message.test.ts` for the pattern).

---

## Task 1: bot — `toggle_bot_status`

**Files:**
- Create: `src/tools/bot/toggle-status.ts`
- Create: `tests/unit/tools/bot.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/bot.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toggleBotStatusTool } from "../../../src/tools/bot/toggle-status.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue({ success: true });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ bot: { toggleStatus: mock } }),
}));

describe("toggle_bot_status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WASAPI_API_KEY = "test";
    process.env.WASAPI_FROM_ID = "10";
  });

  it("maps to { wa_id, data: { from_id, action } } with from_id fallback", async () => {
    const h = wrapHandler(toggleBotStatusTool.schema, toggleBotStatusTool.handler);
    const res = await h({ wa_id: "573001112233", action: "disable" });
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalledWith({ wa_id: "573001112233", data: { from_id: 10, action: "disable" } });
  });

  it("uses explicit from_id when provided", async () => {
    const h = wrapHandler(toggleBotStatusTool.schema, toggleBotStatusTool.handler);
    await h({ wa_id: "573001112233", action: "enable", from_id: 99 });
    expect(mock).toHaveBeenCalledWith({ wa_id: "573001112233", data: { from_id: 99, action: "enable" } });
  });

  it("rejects invalid action", async () => {
    const h = wrapHandler(toggleBotStatusTool.schema, toggleBotStatusTool.handler);
    expect((await h({ wa_id: "573001112233", action: "pause" })).isError).toBe(true);
  });

  it("rejects missing wa_id", async () => {
    const h = wrapHandler(toggleBotStatusTool.schema, toggleBotStatusTool.handler);
    expect((await h({ action: "enable" })).isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/tools/bot.test.ts`

- [ ] **Step 3: Implement the tool**

```ts
// src/tools/bot/toggle-status.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  wa_id: z.string().min(1),
  action: z.enum(["enable", "disable", "disable_permanently"]),
  from_id: z.number().int().positive().optional(),
});

export const toggleBotStatusTool: ToolDefinition<typeof schema> = {
  name: "toggle_bot_status",
  description: "Activa o desactiva el chatbot para un contacto. action: 'enable' lo activa, 'disable' lo desactiva temporalmente, 'disable_permanently' lo desactiva de forma permanente. from_id es opcional si WASAPI_FROM_ID está configurado.",
  schema,
  handler: async ({ wa_id, action, from_id }) => {
    const client = getClient();
    return await (client.bot as any).toggleStatus({
      wa_id,
      data: { from_id: resolveFromId(from_id), action },
    });
  },
};
```

- [ ] **Step 4: Register in `src/tools/index.ts`**

Add import and append `toggleBotStatusTool` to `allTools` (after the metrics tools).

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (213 tests: 209 + 4).

- [ ] **Step 6: Commit**

```bash
git add src/tools/bot/ src/tools/index.ts tests/unit/tools/bot.test.ts
git commit -m "feat(tools): toggle_bot_status (módulo bot)"
```

---

## Task 2: workflow — `get_workflow_statuses`

**Files:**
- Create: `src/tools/workflow/get-statuses.ts`
- Create: `tests/unit/tools/workflow.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/workflow.test.ts
import { describe, it, expect, vi } from "vitest";
import { getWorkflowStatusesTool } from "../../../src/tools/workflow/get-statuses.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue({ data: [] });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ workflow: { getStatuses: mock } }),
}));

describe("get_workflow_statuses", () => {
  it("passes filters through unchanged (snake_case)", async () => {
    const h = wrapHandler(getWorkflowStatusesTool.schema, getWorkflowStatusesTool.handler);
    await h({ action: "open", phone: "573001112233", agent_id: 5, per_page: 25, page: 2 });
    expect(mock).toHaveBeenCalledWith({ action: "open", phone: "573001112233", agent_id: 5, per_page: 25, page: 2 });
  });

  it("works with no args (all optional)", async () => {
    const h = wrapHandler(getWorkflowStatusesTool.schema, getWorkflowStatusesTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalledWith({});
  });

  it("rejects invalid action", async () => {
    const h = wrapHandler(getWorkflowStatusesTool.schema, getWorkflowStatusesTool.handler);
    expect((await h({ action: "archived" })).isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement the tool**

```ts
// src/tools/workflow/get-statuses.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  action: z.enum(["open", "hold", "closed"]).optional(),
  phone: z.string().optional(),
  agent_id: z.number().int().positive().optional(),
  dates: z.string().optional().describe("Rango de fechas; formato YYYY-MM-DD,YYYY-MM-DD"),
  per_page: z.number().int().positive().max(200).optional(),
  page: z.number().int().positive().optional(),
});

export const getWorkflowStatusesTool: ToolDefinition<typeof schema> = {
  name: "get_workflow_statuses",
  description: "Lista los cambios de estado de conversaciones (workflow) con filtros opcionales por estado, teléfono, agente y rango de fechas.",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await (client.workflow as any).getStatuses(args);
  },
};
```

- [ ] **Step 4: Register in `src/tools/index.ts`**

Add import and append `getWorkflowStatusesTool`.

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (216 tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/workflow/ src/tools/index.ts tests/unit/tools/workflow.test.ts
git commit -m "feat(tools): get_workflow_statuses (módulo workflow)"
```

---

## Task 3: customFields — 5 tools

**Files:**
- Create: `src/tools/custom-fields/list.ts`, `src/tools/custom-fields/get.ts`, `src/tools/custom-fields/create.ts`, `src/tools/custom-fields/update.ts`, `src/tools/custom-fields/delete.ts`
- Create: `tests/unit/tools/custom-fields.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/custom-fields.test.ts
import { describe, it, expect, vi } from "vitest";
import { listCustomFieldsTool } from "../../../src/tools/custom-fields/list.js";
import { getCustomFieldTool } from "../../../src/tools/custom-fields/get.js";
import { createCustomFieldTool } from "../../../src/tools/custom-fields/create.js";
import { updateCustomFieldTool } from "../../../src/tools/custom-fields/update.js";
import { deleteCustomFieldTool } from "../../../src/tools/custom-fields/delete.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getById: vi.fn().mockResolvedValue({ success: true, data: { id: "f1" } }),
  create: vi.fn().mockResolvedValue({ success: true, data: { id: "f2" } }),
  update: vi.fn().mockResolvedValue({ success: true, data: { id: "f1" } }),
  delete: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ customFields: mocks }),
}));

describe("custom fields tools", () => {
  it("list_custom_fields takes no args", async () => {
    const h = wrapHandler(listCustomFieldsTool.schema, listCustomFieldsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getAll).toHaveBeenCalled();
  });

  it("get_custom_field passes field_id positionally", async () => {
    const h = wrapHandler(getCustomFieldTool.schema, getCustomFieldTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ field_id: "f1" });
    expect(mocks.getById).toHaveBeenCalledWith("f1");
  });

  it("create_custom_field maps name", async () => {
    const h = wrapHandler(createCustomFieldTool.schema, createCustomFieldTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ name: "Cédula" });
    expect(mocks.create).toHaveBeenCalledWith({ name: "Cédula" });
  });

  it("update_custom_field maps to { id, data: { name } }", async () => {
    const h = wrapHandler(updateCustomFieldTool.schema, updateCustomFieldTool.handler);
    expect((await h({ field_id: "f1" })).isError).toBe(true);
    await h({ field_id: "f1", name: "NIT" });
    expect(mocks.update).toHaveBeenCalledWith({ id: "f1", data: { name: "NIT" } });
  });

  it("delete_custom_field passes field_id positionally", async () => {
    const h = wrapHandler(deleteCustomFieldTool.schema, deleteCustomFieldTool.handler);
    await h({ field_id: "f1" });
    expect(mocks.delete).toHaveBeenCalledWith("f1");
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement the 5 tools**

```ts
// src/tools/custom-fields/list.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listCustomFieldsTool: ToolDefinition<typeof schema> = {
  name: "list_custom_fields",
  description: "Lista todos los campos personalizados (custom fields) de la cuenta.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.customFields as any).getAll();
  },
};
```

```ts
// src/tools/custom-fields/get.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ field_id: z.string().min(1) });

export const getCustomFieldTool: ToolDefinition<typeof schema> = {
  name: "get_custom_field",
  description: "Obtiene un campo personalizado por su ID.",
  schema,
  handler: async ({ field_id }) => {
    const client = getClient();
    return await (client.customFields as any).getById(field_id);
  },
};
```

```ts
// src/tools/custom-fields/create.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ name: z.string().min(1) });

export const createCustomFieldTool: ToolDefinition<typeof schema> = {
  name: "create_custom_field",
  description: "Crea un campo personalizado nuevo con el nombre indicado.",
  schema,
  handler: async ({ name }) => {
    const client = getClient();
    return await (client.customFields as any).create({ name });
  },
};
```

```ts
// src/tools/custom-fields/update.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  field_id: z.string().min(1),
  name: z.string().min(1),
});

export const updateCustomFieldTool: ToolDefinition<typeof schema> = {
  name: "update_custom_field",
  description: "Actualiza el nombre de un campo personalizado existente.",
  schema,
  handler: async ({ field_id, name }) => {
    const client = getClient();
    return await (client.customFields as any).update({ id: field_id, data: { name } });
  },
};
```

```ts
// src/tools/custom-fields/delete.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({ field_id: z.string().min(1) });

export const deleteCustomFieldTool: ToolDefinition<typeof schema> = {
  name: "delete_custom_field",
  description: "Elimina un campo personalizado por su ID. Operación irreversible.",
  schema,
  handler: async ({ field_id }) => {
    const client = getClient();
    return await (client.customFields as any).delete(field_id);
  },
};
```

- [ ] **Step 4: Register the 5 tools in `src/tools/index.ts`**

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (~221 tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/custom-fields/ src/tools/index.ts tests/unit/tools/custom-fields.test.ts
git commit -m "feat(tools): campos personalizados — list/get/create/update/delete (5 tools)"
```

---

## Task 4: user — `get_current_user`

**Files:**
- Create: `src/tools/user/get-user.ts`
- Create: `tests/unit/tools/user.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/tools/user.test.ts
import { describe, it, expect, vi } from "vitest";
import { getCurrentUserTool } from "../../../src/tools/user/get-user.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue({ success: true, data: { id: 1, name: "Ana" } });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ user: { getUser: mock } }),
}));

describe("get_current_user", () => {
  it("takes no args and returns the user", async () => {
    const h = wrapHandler(getCurrentUserTool.schema, getCurrentUserTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalled();
    expect(JSON.parse(res.content[0].text).data.name).toBe("Ana");
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement the tool**

```ts
// src/tools/user/get-user.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const getCurrentUserTool: ToolDefinition<typeof schema> = {
  name: "get_current_user",
  description: "Obtiene los datos de la cuenta/usuario asociado a la API key actual.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.user as any).getUser();
  },
};
```

- [ ] **Step 4: Register in `src/tools/index.ts`**

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (~222 tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/user/ src/tools/index.ts tests/unit/tools/user.test.ts
git commit -m "feat(tools): get_current_user (módulo user)"
```

---

## Task 5: Manifest (51), contract tests, README

**Files:**
- Modify: `scripts/generate-manifest.mjs`, `tests/unit/generate-manifest.test.ts`, `tests/contracts/sdk-shapes.test.ts`, `README.md`

- [ ] **Step 1: Update manifest test first**

In `tests/unit/generate-manifest.test.ts`, rename the test to `declares all 51 tools` and append the 8 new names after `get_agent_time_in_conversation`, in this order:

```
"toggle_bot_status",
"get_workflow_statuses",
"list_custom_fields", "get_custom_field", "create_custom_field",
"update_custom_field", "delete_custom_field",
"get_current_user",
```

- [ ] **Step 2: Run, expect failure. Append 8 entries to `TOOLS` in `scripts/generate-manifest.mjs`**

```js
  { name: "toggle_bot_status", description: "Activa o desactiva el chatbot para un contacto" },
  { name: "get_workflow_statuses", description: "Lista cambios de estado de conversaciones (workflow)" },
  { name: "list_custom_fields", description: "Lista los campos personalizados de la cuenta" },
  { name: "get_custom_field", description: "Obtiene un campo personalizado por ID" },
  { name: "create_custom_field", description: "Crea un campo personalizado" },
  { name: "update_custom_field", description: "Actualiza un campo personalizado" },
  { name: "delete_custom_field", description: "Elimina un campo personalizado" },
  { name: "get_current_user", description: "Obtiene los datos del usuario de la API key actual" },
```

- [ ] **Step 3: Extend `tests/contracts/sdk-shapes.test.ts`**

Add `describe` blocks for the 4 modules: `bot.toggleStatus`; `workflow.getStatuses`; `customFields.getAll/getById/create/update/delete`; `user.getUser`. Each `expectTypeOf<WasapiClient["<module>"]["method"]>().toBeFunction()`.

- [ ] **Step 4: Update README**

In "## Herramientas disponibles": change total to **51 herramientas en total.** and add four groups after Métricas:

```markdown
### Bot (1)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `toggle_bot_status` | Activa/desactiva el chatbot para un contacto | `wa_id`, `action` (enable/disable/disable_permanently), `from_id` (opcional) |

### Workflow (1)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `get_workflow_statuses` | Lista cambios de estado de conversaciones, con filtros | `action`, `phone`, `agent_id`, `dates`, `page` (todos opcionales) |

### Campos personalizados (5)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `list_custom_fields` | Lista los campos personalizados | — |
| `get_custom_field` | Obtiene un campo por ID | `field_id` |
| `create_custom_field` | Crea un campo | `name` |
| `update_custom_field` | Renombra un campo | `field_id`, `name` |
| `delete_custom_field` | Elimina un campo | `field_id` |

### Usuario (1)

| Herramienta | Qué hace | Parámetros clave |
|---|---|---|
| `get_current_user` | Datos de la cuenta asociada a la API key | — |
```

Also update the "Claude decide cuál de las 43 herramientas usar" line to **51**, and add an example to "¿Qué puedo hacer?":
> *"Desactiva el bot para el contacto 573001234567 y dime qué campos personalizados tengo configurados."*

- [ ] **Step 5: Full verification**

```bash
npm test && npm run typecheck && npm run build
npm pack --dry-run | grep -cE "(DS_Store|src/|tests/)"   # expect 0
```
Expected: ~225 tests green, typecheck clean, build clean, 0 leak.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-manifest.mjs tests/ README.md
git commit -m "feat(dxt): manifest 51 tools + contract tests + README (bot, workflow, campos, usuario)"
```

---

## Task 6: Release v0.7.0

**Files:** operational only.

- [ ] **Step 1: Confirm clean tree, bump, push (controller does this; publish is the user's)**

```bash
git status
npm version minor          # 0.6.0 → 0.7.0
git push --follow-tags
```

- [ ] **Step 2: User publishes to npm**

```bash
npm publish --access public --otp=<código>
```

- [ ] **Step 3: Build MCPB**

```bash
npm run package:dxt
unzip -p release/wasapi-mcp-0.7.0.mcpb manifest.json | python3 -c "import json,sys; m=json.load(sys.stdin); print(m['version'], len(m['tools']))"
# expect: 0.7.0 51
cp release/wasapi-mcp-0.7.0.mcpb ~/Desktop/wasapi-mcp.mcpb
```

- [ ] **Step 4: Manual smoke**

Reinstall the `.mcpb`, enable it, and against the real account test: `get_current_user`, `list_custom_fields`, and `get_workflow_statuses` (with and without filters — to validate the SDK's `"undefined"`-in-URL quirk). Document observed behavior + the `dates` format in `docs/sdk-surface.md`.

- [ ] **Step 5: GitHub release**

```bash
gh release create v0.7.0 release/wasapi-mcp-0.7.0.mcpb release/wasapi-mcp.mcpb \
  --title "v0.7.0 — Bot, Workflow, Campos personalizados y Usuario: 51 herramientas" \
  --notes "8 herramientas nuevas que completan la cobertura del SDK: control del chatbot por contacto, estados de workflow, CRUD de campos personalizados y datos del usuario."
```
