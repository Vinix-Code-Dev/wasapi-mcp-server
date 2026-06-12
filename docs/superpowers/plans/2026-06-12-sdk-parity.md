# SDK Parity (whatsapp + contacts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the MCP from 12 to 27 tools to match the full `@wasapi/js-sdk` surface for the `whatsapp` and `contacts` modules, and enrich `send_template` / `send_attachment` with params the SDK supports.

**Architecture:** Identical to existing pattern — one file per tool exporting `{name, description, schema, handler}`, zod validation via `wrapHandler`, singleton client from `src/wasapi.ts`, optional `from_id`/`phone_id` falling back to `resolveFromId` (`src/lib/from-id.ts`). No structural changes.

**Tech Stack:** TypeScript, zod v3, vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-12-sdk-parity-design.md`

**Resolved open question:** the SDK passes `recipients` straight through to the API (type says `string`, comma-separated). The MCP tool keeps `recipients: z.array(z.string())` for model ergonomics and the handler does `recipients.join(",")`. The SDK auto-derives the `file` type from `url_file` (`getTemplateFileType`), so the tool exposes `url_file` + `file_name` but NOT `file`.

**Test mock convention (all tasks):** same as existing tests — `vi.mock("../../../src/wasapi.js", ...)` returning a fake client; assert exact args passed to the SDK mock; use `wrapHandler(tool.schema, tool.handler)`.

---

## Task 1: Contacts parity — `assign_agent_to_contact` + `export_contacts`

**Files:**
- Create: `src/tools/contacts/assign-agent.ts`, `src/tools/contacts/export.ts`
- Create: `tests/unit/tools/contacts-assign-agent.test.ts`, `tests/unit/tools/contacts-export.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/contacts-assign-agent.test.ts
import { describe, it, expect, vi } from "vitest";
import { assignAgentTool } from "../../../src/tools/contacts/assign-agent.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue({ success: true, data: { id: 1 } });
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { assingAgentAutomatic: mock } }),
}));

describe("assign_agent_to_contact", () => {
  it("assigns agent by contact_uuid", async () => {
    const h = wrapHandler(assignAgentTool.schema, assignAgentTool.handler);
    const res = await h({ contact_uuid: "abc-123" });
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalledWith({ contact_uuid: "abc-123" });
  });

  it("rejects missing contact_uuid", async () => {
    const h = wrapHandler(assignAgentTool.schema, assignAgentTool.handler);
    const res = await h({});
    expect(res.isError).toBe(true);
  });
});
```

```ts
// tests/unit/tools/contacts-export.test.ts
import { describe, it, expect, vi } from "vitest";
import { exportContactsTool } from "../../../src/tools/contacts/export.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mock = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ contacts: { export: mock } }),
}));

describe("export_contacts", () => {
  it("exports with email_urls", async () => {
    const h = wrapHandler(exportContactsTool.schema, exportContactsTool.handler);
    const res = await h({ email_urls: ["a@b.com"] });
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalledWith({ email_urls: ["a@b.com"] });
    expect(JSON.parse(res.content[0].text).success).toBe(true);
  });

  it("works with no args", async () => {
    const h = wrapHandler(exportContactsTool.schema, exportContactsTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
  });

  it("rejects invalid email", async () => {
    const h = wrapHandler(exportContactsTool.schema, exportContactsTool.handler);
    const res = await h({ email_urls: ["not-an-email"] });
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/tools/contacts-assign-agent.test.ts tests/unit/tools/contacts-export.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both tools**

```ts
// src/tools/contacts/assign-agent.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  contact_uuid: z.string().min(1),
});

export const assignAgentTool: ToolDefinition<typeof schema> = {
  name: "assign_agent_to_contact",
  description: "Asigna automáticamente un agente al contacto (rotación automática de Wasapi). Usa el contact_uuid del contacto.",
  schema,
  handler: async ({ contact_uuid }) => {
    const client = getClient();
    return await (client.contacts as any).assingAgentAutomatic({ contact_uuid });
  },
};
```

```ts
// src/tools/contacts/export.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  email_urls: z.array(z.string().email()).optional(),
});

export const exportContactsTool: ToolDefinition<typeof schema> = {
  name: "export_contacts",
  description: "Inicia una exportación de todos los contactos de la cuenta. Opcionalmente recibe emails a los que enviar el archivo exportado.",
  schema,
  handler: async (args) => {
    const client = getClient();
    await (client.contacts as any).export(args);
    return { success: true, message: "Exportación de contactos iniciada" };
  },
};
```

- [ ] **Step 4: Register both in `src/tools/index.ts`**

Add imports and append `assignAgentTool, exportContactsTool` to the `allTools` array (keep contacts tools grouped together).

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: all green (134 tests: 129 + 5).

- [ ] **Step 6: Commit**

```bash
git add src/tools/contacts/ src/tools/index.ts tests/unit/tools/
git commit -m "feat(tools): assign_agent_to_contact y export_contacts (paridad contacts)"
```

---

## Task 2: Templates group — 5 tools

**Files:**
- Create: `src/tools/whatsapp/list-templates.ts`, `src/tools/whatsapp/get-template.ts`, `src/tools/whatsapp/get-template-fields.ts`, `src/tools/whatsapp/list-templates-by-number.ts`, `src/tools/whatsapp/sync-meta-templates.ts`
- Create: `tests/unit/tools/whatsapp-templates.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/whatsapp-templates.test.ts
import { describe, it, expect, vi } from "vitest";
import { listTemplatesTool } from "../../../src/tools/whatsapp/list-templates.js";
import { getTemplateTool } from "../../../src/tools/whatsapp/get-template.js";
import { getTemplateFieldsTool } from "../../../src/tools/whatsapp/get-template-fields.js";
import { listTemplatesByNumberTool } from "../../../src/tools/whatsapp/list-templates-by-number.js";
import { syncMetaTemplatesTool } from "../../../src/tools/whatsapp/sync-meta-templates.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getWhatsappTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWhatsappTemplate: vi.fn().mockResolvedValue({ success: true, data: { uuid: "t1" } }),
  getFieldsTemplate: vi.fn().mockResolvedValue({ fields: [] }),
  getTemplatesByAppId: vi.fn().mockResolvedValue([]),
  syncMetaTemplates: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: mocks }),
}));

describe("templates tools", () => {
  it("list_whatsapp_templates takes no args", async () => {
    const h = wrapHandler(listTemplatesTool.schema, listTemplatesTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mocks.getWhatsappTemplates).toHaveBeenCalled();
  });

  it("get_whatsapp_template requires template_uuid", async () => {
    const h = wrapHandler(getTemplateTool.schema, getTemplateTool.handler);
    expect((await h({})).isError).toBe(true);
    const ok = await h({ template_uuid: "t1" });
    expect(ok.isError).toBeFalsy();
    expect(mocks.getWhatsappTemplate).toHaveBeenCalledWith({ template_uuid: "t1" });
  });

  it("get_template_fields passes uuid as positional arg", async () => {
    const h = wrapHandler(getTemplateFieldsTool.schema, getTemplateFieldsTool.handler);
    await h({ template_uuid: "t2" });
    expect(mocks.getFieldsTemplate).toHaveBeenCalledWith("t2");
  });

  it("list_templates_by_number requires from_id", async () => {
    const h = wrapHandler(listTemplatesByNumberTool.schema, listTemplatesByNumberTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ from_id: 99 });
    expect(mocks.getTemplatesByAppId).toHaveBeenCalledWith({ from_id: 99 });
  });

  it("sync_meta_templates takes no args", async () => {
    const h = wrapHandler(syncMetaTemplatesTool.schema, syncMetaTemplatesTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mocks.syncMetaTemplates).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/tools/whatsapp-templates.test.ts`

- [ ] **Step 3: Implement the 5 tools**

```ts
// src/tools/whatsapp/list-templates.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listTemplatesTool: ToolDefinition<typeof schema> = {
  name: "list_whatsapp_templates",
  description: "Lista todas las plantillas de WhatsApp de la cuenta.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.whatsapp as any).getWhatsappTemplates();
  },
};
```

```ts
// src/tools/whatsapp/get-template.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  template_uuid: z.string().min(1),
});

export const getTemplateTool: ToolDefinition<typeof schema> = {
  name: "get_whatsapp_template",
  description: "Obtiene el detalle de una plantilla de WhatsApp por su UUID.",
  schema,
  handler: async ({ template_uuid }) => {
    const client = getClient();
    return await (client.whatsapp as any).getWhatsappTemplate({ template_uuid });
  },
};
```

```ts
// src/tools/whatsapp/get-template-fields.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  template_uuid: z.string().min(1),
});

export const getTemplateFieldsTool: ToolDefinition<typeof schema> = {
  name: "get_template_fields",
  description: "Obtiene los campos/variables que acepta una plantilla (útil antes de enviar con send_template y body_vars).",
  schema,
  handler: async ({ template_uuid }) => {
    const client = getClient();
    return await (client.whatsapp as any).getFieldsTemplate(template_uuid);
  },
};
```

```ts
// src/tools/whatsapp/list-templates-by-number.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  from_id: z.number().int().positive(),
});

export const listTemplatesByNumberTool: ToolDefinition<typeof schema> = {
  name: "list_templates_by_number",
  description: "Lista las plantillas disponibles para un número de WhatsApp específico (from_id).",
  schema,
  handler: async ({ from_id }) => {
    const client = getClient();
    return await (client.whatsapp as any).getTemplatesByAppId({ from_id });
  },
};
```

```ts
// src/tools/whatsapp/sync-meta-templates.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const syncMetaTemplatesTool: ToolDefinition<typeof schema> = {
  name: "sync_meta_templates",
  description: "Sincroniza las plantillas desde Meta hacia Wasapi. Puede tardar; úsalo cuando creaste o editaste plantillas en Meta Business.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.whatsapp as any).syncMetaTemplates();
  },
};
```

- [ ] **Step 4: Register the 5 tools in `src/tools/index.ts`**

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: green (139 tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/whatsapp/ src/tools/index.ts tests/unit/tools/whatsapp-templates.test.ts
git commit -m "feat(tools): grupo de plantillas — list/get/fields/by-number/sync (5 tools)"
```

---

## Task 3: Conversation + messages — `change_conversation_status` + `send_contact_card`

**Files:**
- Create: `src/tools/whatsapp/change-status.ts`, `src/tools/whatsapp/send-contact-card.ts`
- Create: `tests/unit/tools/whatsapp-status-card.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/whatsapp-status-card.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { changeStatusTool } from "../../../src/tools/whatsapp/change-status.js";
import { sendContactCardTool } from "../../../src/tools/whatsapp/send-contact-card.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  changeStatus: vi.fn().mockResolvedValue({ success: true }),
  sendContacts: vi.fn().mockResolvedValue({ success: true, contacts_sent: 1 }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: mocks }),
}));

describe("change_conversation_status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WASAPI_FROM_ID = "10";
  });

  it("changes status with from_id fallback", async () => {
    const h = wrapHandler(changeStatusTool.schema, changeStatusTool.handler);
    const res = await h({ wa_id: "573001", status: "closed" });
    expect(res.isError).toBeFalsy();
    expect(mocks.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ wa_id: "573001", status: "closed", from_id: 10 }),
    );
  });

  it("rejects invalid status", async () => {
    const h = wrapHandler(changeStatusTool.schema, changeStatusTool.handler);
    expect((await h({ wa_id: "573001", status: "archived" })).isError).toBe(true);
  });
});

describe("send_contact_card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WASAPI_FROM_ID = "10";
  });

  it("sends a contact card", async () => {
    const h = wrapHandler(sendContactCardTool.schema, sendContactCardTool.handler);
    const res = await h({
      wa_id: "573001",
      contacts: [{ name: { first_name: "Ana" }, phones: [{ phone: "+573001112233", type: "CELL" }] }],
    });
    expect(res.isError).toBeFalsy();
    expect(mocks.sendContacts).toHaveBeenCalledWith(
      expect.objectContaining({ wa_id: "573001", from_id: 10 }),
    );
  });

  it("rejects empty contacts array", async () => {
    const h = wrapHandler(sendContactCardTool.schema, sendContactCardTool.handler);
    expect((await h({ wa_id: "573001", contacts: [] })).isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement both tools**

```ts
// src/tools/whatsapp/change-status.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  wa_id: z.string().min(1),
  status: z.enum(["open", "hold", "closed"]),
  from_id: z.number().int().positive().optional(),
  message: z.string().optional(),
  agent_id: z.number().int().positive().optional(),
  send_end_message: z.boolean().optional(),
});

export const changeStatusTool: ToolDefinition<typeof schema> = {
  name: "change_conversation_status",
  description: "Cambia el estado de la conversación con un contacto: open, hold o closed. Opcionalmente asigna agente o envía mensaje de cierre.",
  schema,
  handler: async ({ wa_id, status, from_id, ...rest }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await (client.whatsapp as any).changeStatus({ wa_id, status, from_id: resolved, ...rest });
  },
};
```

```ts
// src/tools/whatsapp/send-contact-card.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const contactCard = z.object({
  name: z.object({
    formatted_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    middle_name: z.string().optional(),
    suffix: z.string().optional(),
    prefix: z.string().optional(),
  }),
  birthday: z.string().optional(),
  phones: z.array(z.object({ phone: z.string(), type: z.string(), wa_id: z.string().optional() })).optional(),
  emails: z.array(z.object({ email: z.string(), type: z.string() })).optional(),
  org: z.object({ company: z.string(), department: z.string(), title: z.string() }).optional(),
  urls: z.array(z.object({ url: z.string(), type: z.string() })).optional(),
  addresses: z
    .array(
      z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
        country: z.string(),
        country_code: z.string(),
        type: z.string(),
      }),
    )
    .optional(),
});

const schema = z.object({
  wa_id: z.string().min(1),
  contacts: z.array(contactCard).min(1),
  from_id: z.number().int().positive().optional(),
  context_wam_id: z.string().optional(),
});

export const sendContactCardTool: ToolDefinition<typeof schema> = {
  name: "send_contact_card",
  description: "Envía una o más tarjetas de contacto (vCard) por WhatsApp a un destinatario.",
  schema,
  handler: async ({ wa_id, contacts, from_id, context_wam_id }) => {
    const client = getClient();
    const resolved = resolveFromId(from_id);
    return await (client.whatsapp as any).sendContacts({ wa_id, from_id: resolved, context_wam_id, contacts });
  },
};
```

- [ ] **Step 4: Register both, run `npm test`, expect green (143 tests)**

- [ ] **Step 5: Commit**

```bash
git add src/tools/whatsapp/ src/tools/index.ts tests/unit/tools/whatsapp-status-card.test.ts
git commit -m "feat(tools): change_conversation_status y send_contact_card"
```

---

## Task 4: Flows group — 6 tools

**Files:**
- Create: `src/tools/whatsapp/list-flows.ts`, `src/tools/whatsapp/list-flows-by-number.ts`, `src/tools/whatsapp/send-flow.ts`, `src/tools/whatsapp/get-flow-responses.ts`, `src/tools/whatsapp/get-flow-assets.ts`, `src/tools/whatsapp/get-flow-screens.ts`
- Create: `tests/unit/tools/whatsapp-flows.test.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/tools/whatsapp-flows.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listFlowsTool } from "../../../src/tools/whatsapp/list-flows.js";
import { listFlowsByNumberTool } from "../../../src/tools/whatsapp/list-flows-by-number.js";
import { sendFlowTool } from "../../../src/tools/whatsapp/send-flow.js";
import { getFlowResponsesTool } from "../../../src/tools/whatsapp/get-flow-responses.js";
import { getFlowAssetsTool } from "../../../src/tools/whatsapp/get-flow-assets.js";
import { getFlowScreensTool } from "../../../src/tools/whatsapp/get-flow-screens.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  getFlows: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getFlowsByPhoneId: vi.fn().mockResolvedValue({ data: [] }),
  sendFlow: vi.fn().mockResolvedValue({ success: true }),
  getFlowResponses: vi.fn().mockResolvedValue({ data: [] }),
  getFlowAssets: vi.fn().mockResolvedValue({ success: true, data: {} }),
  getFlowScreens: vi.fn().mockResolvedValue({ screens: [] }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: mocks }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WASAPI_FROM_ID = "10";
});

describe("flows tools", () => {
  it("list_flows takes no args", async () => {
    const h = wrapHandler(listFlowsTool.schema, listFlowsTool.handler);
    expect((await h({})).isError).toBeFalsy();
    expect(mocks.getFlows).toHaveBeenCalled();
  });

  it("list_flows_by_number falls back to WASAPI_FROM_ID", async () => {
    const h = wrapHandler(listFlowsByNumberTool.schema, listFlowsByNumberTool.handler);
    await h({});
    expect(mocks.getFlowsByPhoneId).toHaveBeenCalledWith(10);
  });

  it("send_flow requires wa_id, message, cta, screen, flow_id", async () => {
    const h = wrapHandler(sendFlowTool.schema, sendFlowTool.handler);
    expect((await h({ wa_id: "57300" })).isError).toBe(true);
    const ok = await h({ wa_id: "57300", message: "hola", cta: "Abrir", screen: "WELCOME", flow_id: "f1" });
    expect(ok.isError).toBeFalsy();
    expect(mocks.sendFlow).toHaveBeenCalledWith(
      expect.objectContaining({ wa_id: "57300", flow_id: "f1", phone_id: 10 }),
    );
  });

  it("get_flow_responses requires flow_id, supports paging", async () => {
    const h = wrapHandler(getFlowResponsesTool.schema, getFlowResponsesTool.handler);
    expect((await h({})).isError).toBe(true);
    await h({ flow_id: "f1", page: 2, per_page: 25 });
    expect(mocks.getFlowResponses).toHaveBeenCalledWith({ flow_id: "f1", page: 2, per_page: 25 });
  });

  it("get_flow_assets and get_flow_screens take flow_id + optional phone_id", async () => {
    const ha = wrapHandler(getFlowAssetsTool.schema, getFlowAssetsTool.handler);
    await ha({ flow_id: "f1" });
    expect(mocks.getFlowAssets).toHaveBeenCalledWith({ flow_id: "f1", phone_id: 10 });
    const hs = wrapHandler(getFlowScreensTool.schema, getFlowScreensTool.handler);
    await hs({ flow_id: "f1", phone_id: 77 });
    expect(mocks.getFlowScreens).toHaveBeenCalledWith({ flow_id: "f1", phone_id: 77 });
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement the 6 tools**

```ts
// src/tools/whatsapp/list-flows.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({});

export const listFlowsTool: ToolDefinition<typeof schema> = {
  name: "list_flows",
  description: "Lista todos los WhatsApp Flows de la cuenta.",
  schema,
  handler: async () => {
    const client = getClient();
    return await (client.whatsapp as any).getFlows();
  },
};
```

```ts
// src/tools/whatsapp/list-flows-by-number.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  from_id: z.number().int().positive().optional(),
});

export const listFlowsByNumberTool: ToolDefinition<typeof schema> = {
  name: "list_flows_by_number",
  description: "Lista los WhatsApp Flows disponibles para un número específico (from_id; usa el default si se omite).",
  schema,
  handler: async ({ from_id }) => {
    const client = getClient();
    return await (client.whatsapp as any).getFlowsByPhoneId(resolveFromId(from_id));
  },
};
```

```ts
// src/tools/whatsapp/send-flow.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  wa_id: z.string().min(1),
  message: z.string().min(1),
  cta: z.string().min(1).describe("Texto del botón que abre el flow"),
  screen: z.string().min(1).describe("Pantalla inicial del flow (p.ej. WELCOME)"),
  flow_id: z.string().min(1),
  phone_id: z.number().int().positive().optional(),
  action: z.enum(["navigate", "data_exchange"]).optional(),
});

export const sendFlowTool: ToolDefinition<typeof schema> = {
  name: "send_flow",
  description: "Envía un WhatsApp Flow interactivo a un contacto. Usa list_flows para descubrir flow_id y get_flow_screens para las pantallas.",
  schema,
  handler: async ({ phone_id, ...rest }) => {
    const client = getClient();
    return await (client.whatsapp as any).sendFlow({ ...rest, phone_id: resolveFromId(phone_id) });
  },
};
```

```ts
// src/tools/whatsapp/get-flow-responses.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";

const schema = z.object({
  flow_id: z.string().min(1),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(200).optional(),
});

export const getFlowResponsesTool: ToolDefinition<typeof schema> = {
  name: "get_flow_responses",
  description: "Obtiene las respuestas que los usuarios enviaron a través de un WhatsApp Flow (paginado).",
  schema,
  handler: async (args) => {
    const client = getClient();
    return await (client.whatsapp as any).getFlowResponses(args);
  },
};
```

```ts
// src/tools/whatsapp/get-flow-assets.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  flow_id: z.string().min(1),
  phone_id: z.number().int().positive().optional(),
});

export const getFlowAssetsTool: ToolDefinition<typeof schema> = {
  name: "get_flow_assets",
  description: "Obtiene el detalle y los assets de un WhatsApp Flow (definición, pantallas, si usa data API).",
  schema,
  handler: async ({ flow_id, phone_id }) => {
    const client = getClient();
    return await (client.whatsapp as any).getFlowAssets({ flow_id, phone_id: resolveFromId(phone_id) });
  },
};
```

```ts
// src/tools/whatsapp/get-flow-screens.ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const schema = z.object({
  flow_id: z.string().min(1),
  phone_id: z.number().int().positive().optional(),
});

export const getFlowScreensTool: ToolDefinition<typeof schema> = {
  name: "get_flow_screens",
  description: "Lista las pantallas de un WhatsApp Flow (útil para elegir el parámetro screen de send_flow).",
  schema,
  handler: async ({ flow_id, phone_id }) => {
    const client = getClient();
    return await (client.whatsapp as any).getFlowScreens({ flow_id, phone_id: resolveFromId(phone_id) });
  },
};
```

- [ ] **Step 4: Register the 6 tools, run `npm test`, expect green (~149 tests)**

- [ ] **Step 5: Commit**

```bash
git add src/tools/whatsapp/ src/tools/index.ts tests/unit/tools/whatsapp-flows.test.ts
git commit -m "feat(tools): WhatsApp Flows — list/send/responses/assets/screens (6 tools)"
```

---

## Task 5: Upgrade `send_template`

**Files:**
- Modify: `src/tools/whatsapp/send-template.ts`
- Modify: `tests/unit/tools/whatsapp-send-template.test.ts`

- [ ] **Step 1: Add failing tests for the new params**

Append to the existing describe block in `tests/unit/tools/whatsapp-send-template.test.ts`:

```ts
  it("joins recipients array into CSV string for the SDK", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    await h({ to: undefined, recipients: ["57300", "57311"], template_id: "t1", contact_type: "phone" } as any);
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ recipients: "57300,57311" }));
  });

  it("passes template variables through", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    await h({
      recipients: ["57300"],
      template_id: "t1",
      contact_type: "phone",
      body_vars: [{ text: "{{1}}", val: "Ana" }],
      url_file: "https://x.com/a.pdf",
      file_name: "contrato.pdf",
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body_vars: [{ text: "{{1}}", val: "Ana" }],
        url_file: "https://x.com/a.pdf",
        file_name: "contrato.pdf",
      }),
    );
  });

  it("rejects invalid contact_type", async () => {
    const h = wrapHandler(sendTemplateTool.schema, sendTemplateTool.handler);
    expect((await h({ recipients: ["57300"], template_id: "t1", contact_type: "group" })).isError).toBe(true);
  });
```

NOTE: remove/adjust any older test asserting `contact_type` free-string behavior. The first new test's `to: undefined` cast is only to satisfy older signatures if present — clean up to match final schema.

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Replace the schema and handler in `src/tools/whatsapp/send-template.ts`**

```ts
import { z } from "zod";
import type { ToolDefinition } from "../../lib/register-tool.js";
import { getClient } from "../../wasapi.js";
import { resolveFromId } from "../../lib/from-id.js";

const templateVar = z.object({
  text: z.string().describe("Nombre del placeholder en la plantilla, p.ej. {{1}}"),
  val: z.union([z.string(), z.number()]).describe("Valor a sustituir"),
});

const schema = z.object({
  recipients: z.array(z.string().min(1)).min(1).describe("wa_ids destino (E.164 sin +)"),
  template_id: z.string().min(1).describe("UUID de la plantilla (ver list_whatsapp_templates)"),
  contact_type: z.enum(["phone", "contact"]),
  from_id: z.number().int().positive().optional(),
  body_vars: z.array(templateVar).optional().describe("Variables del cuerpo de la plantilla"),
  header_var: z.array(templateVar).optional().describe("Variable del encabezado"),
  cta_var: z.array(templateVar).optional().describe("Variable del botón CTA"),
  url_file: z.string().url().optional().describe("URL pública de archivo adjunto (imagen/video/documento/audio)"),
  file_name: z.string().optional(),
  chatbot_status: z.enum(["enable", "disable", "disable_permanently"]).optional(),
  conversation_status: z.enum(["open", "hold", "closed", "unchanged"]).optional(),
  agent_id: z.number().int().positive().optional(),
});

export const sendTemplateTool: ToolDefinition<typeof schema> = {
  name: "send_template",
  description:
    "Envía una plantilla aprobada de WhatsApp a uno o más destinatarios. Soporta variables (body_vars/header_var/cta_var — consulta get_template_fields para conocerlas) y adjuntos por URL (url_file). from_id es opcional si WASAPI_FROM_ID está configurado.",
  schema,
  handler: async ({ recipients, from_id, ...rest }) => {
    const client = getClient();
    return await (client.whatsapp as any).sendTemplate({
      recipients: recipients.join(","),
      from_id: resolveFromId(from_id),
      ...rest,
    });
  },
};
```

- [ ] **Step 4: Run full suite; fix any older send_template tests that asserted the previous looser schema. Expect green (~152 tests)**

- [ ] **Step 5: Commit**

```bash
git add src/tools/whatsapp/send-template.ts tests/unit/tools/whatsapp-send-template.test.ts
git commit -m "feat(tools): send_template con variables, adjuntos por URL y enums estrictos"
```

---

## Task 6: Upgrade `send_attachment` (filename)

**Files:**
- Modify: `src/tools/whatsapp/send-attachment.ts`
- Modify: `tests/unit/tools/whatsapp-send-attachment.test.ts`

- [ ] **Step 1: Add failing test**

```ts
  it("passes optional filename through", async () => {
    const h = wrapHandler(sendAttachmentTool.schema, sendAttachmentTool.handler);
    await h({ wa_id: "57300", filePath: "/tmp/a.pdf", filename: "propuesta.pdf" });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ filename: "propuesta.pdf" }));
  });
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Add `filename: z.string().optional()` to the schema and pass it through in the handler**

In `src/tools/whatsapp/send-attachment.ts`, add to the schema object:
```ts
  filename: z.string().optional().describe("Nombre con el que el destinatario recibe el archivo"),
```
And include `filename` in the object passed to `sendAttachment` (destructure + forward, same pattern as `caption`).

- [ ] **Step 4: Run, expect green (~153 tests)**

- [ ] **Step 5: Commit**

```bash
git add src/tools/whatsapp/send-attachment.ts tests/unit/tools/whatsapp-send-attachment.test.ts
git commit -m "feat(tools): send_attachment acepta filename opcional"
```

---

## Task 7: Manifest (27 tools), contract tests, sdk-surface.md

**Files:**
- Modify: `scripts/generate-manifest.mjs` (TOOLS array)
- Modify: `tests/unit/generate-manifest.test.ts`
- Modify: `tests/contracts/sdk-shapes.test.ts`
- Modify: `docs/sdk-surface.md`

- [ ] **Step 1: Update the failing manifest test first**

In `tests/unit/generate-manifest.test.ts`, replace the `declares all 12 tools` test with the 27-name list (order: the 12 existing in current order, then the 15 new in the order added in Tasks 1-4):

```ts
  it("declares all 27 tools", () => {
    const m = buildManifest(pkgFixture);
    const names = m.tools.map((t) => t.name);
    expect(names).toEqual([
      "list_contacts", "get_contact", "create_contact", "update_contact",
      "delete_contact", "add_label_to_contact", "remove_label_from_contact",
      "list_whatsapp_numbers", "send_message", "send_template",
      "send_attachment", "get_conversation",
      "assign_agent_to_contact", "export_contacts",
      "list_whatsapp_templates", "get_whatsapp_template", "get_template_fields",
      "list_templates_by_number", "sync_meta_templates",
      "change_conversation_status", "send_contact_card",
      "list_flows", "list_flows_by_number", "send_flow",
      "get_flow_responses", "get_flow_assets", "get_flow_screens",
    ]);
  });
```

- [ ] **Step 2: Run, expect failure. Then extend `TOOLS` in `scripts/generate-manifest.mjs`**

Append after the existing 12 entries (descriptions in Spanish):

```js
  { name: "assign_agent_to_contact", description: "Asigna automáticamente un agente a un contacto" },
  { name: "export_contacts", description: "Inicia una exportación de todos los contactos" },
  { name: "list_whatsapp_templates", description: "Lista las plantillas de WhatsApp de la cuenta" },
  { name: "get_whatsapp_template", description: "Obtiene el detalle de una plantilla por UUID" },
  { name: "get_template_fields", description: "Obtiene los campos/variables de una plantilla" },
  { name: "list_templates_by_number", description: "Lista plantillas disponibles para un número" },
  { name: "sync_meta_templates", description: "Sincroniza las plantillas desde Meta" },
  { name: "change_conversation_status", description: "Cambia el estado de una conversación (open/hold/closed)" },
  { name: "send_contact_card", description: "Envía tarjetas de contacto (vCard) por WhatsApp" },
  { name: "list_flows", description: "Lista los WhatsApp Flows de la cuenta" },
  { name: "list_flows_by_number", description: "Lista los Flows disponibles para un número" },
  { name: "send_flow", description: "Envía un WhatsApp Flow interactivo a un contacto" },
  { name: "get_flow_responses", description: "Obtiene las respuestas de un Flow (paginado)" },
  { name: "get_flow_assets", description: "Obtiene el detalle y assets de un Flow" },
  { name: "get_flow_screens", description: "Lista las pantallas de un Flow" },
```

- [ ] **Step 3: Extend `tests/contracts/sdk-shapes.test.ts`**

Add one `expectTypeOf<WasapiClient["..."]["method"]>().toBeFunction()` per new SDK method used: `contacts.assingAgentAutomatic`, `contacts.export`, `whatsapp.getWhatsappTemplates`, `whatsapp.getWhatsappTemplate`, `whatsapp.getFieldsTemplate`, `whatsapp.getTemplatesByAppId`, `whatsapp.syncMetaTemplates`, `whatsapp.changeStatus`, `whatsapp.sendContacts`, `whatsapp.getFlows`, `whatsapp.getFlowsByPhoneId`, `whatsapp.sendFlow`, `whatsapp.getFlowResponses`, `whatsapp.getFlowAssets`, `whatsapp.getFlowScreens`.

- [ ] **Step 4: Rewrite `docs/sdk-surface.md`**

Document the verified full surface of both modules (method signatures from `node_modules/@wasapi/js-sdk/dist/types/`), including: campaigns create/update/delete are stubs that throw; `recipients` is a CSV string at the API level; `getFieldsTemplate`/`getFlowsByPhoneId`/`getFlowScreens` return `any` (document observed shapes after smoke testing).

- [ ] **Step 5: Run `npm test && npm run typecheck`, expect green (~170 tests)**

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-manifest.mjs tests/ docs/sdk-surface.md
git commit -m "feat(dxt): manifest con 27 tools + contract tests + sdk-surface actualizado"
```

---

## Task 8: README + release v0.4.0

**Files:**
- Modify: `README.md`
- Operational: bump, publish, mcpb, GitHub release

- [ ] **Step 1: Update README tools section**

Replace "## Herramientas disponibles" content: **27 herramientas en total.** Tables by group:
- Contactos (9): the existing 7 + `assign_agent_to_contact` + `export_contacts`
- WhatsApp — Mensajería y conversaciones (7): `list_whatsapp_numbers`, `send_message`, `send_attachment`, `get_conversation`, `change_conversation_status`, `send_contact_card`, `send_template`
- WhatsApp — Plantillas (5): `list_whatsapp_templates`, `get_whatsapp_template`, `get_template_fields`, `list_templates_by_number`, `sync_meta_templates`
- WhatsApp — Flows (6): `list_flows`, `list_flows_by_number`, `send_flow`, `get_flow_responses`, `get_flow_assets`, `get_flow_screens`

Each row: nombre, qué hace (español), parámetros clave. Update `send_template` row to mention variables y url_file.

- [ ] **Step 2: Update "Limitaciones conocidas"**

- Remove: "`send_template` sin variables".
- Reword attachment row: "`send_attachment` requiere ruta local — para enviar archivos por URL usa `send_template` con `url_file`".
- Keep: `list_conversations` (still missing), Claude.ai web.

- [ ] **Step 3: Add examples to "¿Qué puedo hacer?"**

Add 2 examples: *"Envíale la plantilla de bienvenida a +57… con el nombre Ana en la variable 1"* and *"¿Qué flows tengo configurados? Envíale el flow de encuesta al 57300…"*.

- [ ] **Step 4: Full verification**

```bash
npm test && npm run typecheck && npm run build
npm pack --dry-run | grep -cE "(DS_Store|src/|tests/)"   # expect 0
```

- [ ] **Step 5: Bump + push (controller does this; publish is the user's)**

```bash
npm version minor          # 0.3.2 → 0.4.0
git push --follow-tags
```

- [ ] **Step 6: User publishes to npm**

```bash
npm publish --access public --otp=<código>
```

- [ ] **Step 7: Build MCPB + smoke + GitHub release**

```bash
npm run package:dxt
# manual smoke: docs/mcpb-smoke.md + probar list_flows / list_whatsapp_templates / get_template_fields con la cuenta real
gh release create v0.4.0 release/wasapi-mcp-0.4.0.mcpb release/wasapi-mcp.mcpb \
  --title "v0.4.0 — Paridad total con el SDK: 27 herramientas" \
  --notes "15 herramientas nuevas (plantillas, flows, conversaciones, contactos) + send_template con variables y adjuntos por URL."
```
