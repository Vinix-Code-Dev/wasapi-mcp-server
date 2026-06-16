# Anthropic Directory Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make `@wasapi/mcp-server` pass the Claude Connectors Directory review — add tool annotations (title + readOnlyHint/destructiveHint) to all 62 tools and a privacy policy. Ship as v1.1.0.

**Architecture:** A centralized `src/lib/tool-annotations.ts` maps each tool name → `{ title, readOnly }`; `src/server.ts` attaches MCP `annotations` to each tool in the `tools/list` response. Privacy policy added to the manifest (`privacy_policies`) and README. No tool handler changes.

**Tech Stack:** TypeScript, zod v3, vitest. No new deps.

**Spec:** `docs/superpowers/specs/2026-06-16-anthropic-directory-design.md`

---

## Task 1: Tool annotations map + completeness test

**Files:**
- Create: `src/lib/tool-annotations.ts`
- Create: `tests/unit/tool-annotations.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/tool-annotations.test.ts
import { describe, it, expect } from "vitest";
import { getAnnotations, TOOL_ANNOTATIONS } from "../../src/lib/tool-annotations.js";
import { allTools } from "../../src/tools/index.js";

describe("tool annotations", () => {
  it("every registered tool has an annotation entry", () => {
    const missing = allTools.map((t) => t.name).filter((n) => !(n in TOOL_ANNOTATIONS));
    expect(missing).toEqual([]);
  });

  it("read-only tools resolve to readOnlyHint:true", () => {
    const a = getAnnotations("list_contacts");
    expect(a.title).toBeTruthy();
    expect(a.readOnlyHint).toBe(true);
    expect(a.destructiveHint).toBeUndefined();
  });

  it("write tools resolve to destructiveHint:true", () => {
    const a = getAnnotations("delete_contact");
    expect(a.title).toBeTruthy();
    expect(a.readOnlyHint).toBe(false);
    expect(a.destructiveHint).toBe(true);
  });

  it("unknown tool name falls back to destructive (conservative)", () => {
    const a = getAnnotations("__not_a_tool__");
    expect(a.readOnlyHint).toBe(false);
    expect(a.destructiveHint).toBe(true);
  });

  it("count matches: 40 read-only, 22 write", () => {
    const entries = Object.values(TOOL_ANNOTATIONS);
    expect(entries.filter((e) => e.readOnly).length).toBe(40);
    expect(entries.filter((e) => !e.readOnly).length).toBe(22);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/tool-annotations.test.ts`

- [ ] **Step 3: Implement `src/lib/tool-annotations.ts`**

```ts
// src/lib/tool-annotations.ts
// Single source of truth for MCP tool annotations required by the Claude
// Connectors Directory: each tool needs a human-readable title and either
// readOnlyHint (pure reads) or destructiveHint (writes/side effects).

export interface ToolAnnotationSource {
  title: string;
  readOnly: boolean;
}

export interface McpToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint?: true;
}

const R = (title: string): ToolAnnotationSource => ({ title, readOnly: true });
const W = (title: string): ToolAnnotationSource => ({ title, readOnly: false });

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotationSource> = {
  // Contacts
  list_contacts: R("Listar contactos"),
  get_contact: R("Ver contacto"),
  create_contact: W("Crear contacto"),
  update_contact: W("Actualizar contacto"),
  delete_contact: W("Eliminar contacto"),
  add_label_to_contact: W("Agregar etiqueta a contacto"),
  remove_label_from_contact: W("Quitar etiqueta de contacto"),
  assign_agent_to_contact: W("Asignar agente a contacto"),
  export_contacts: W("Exportar contactos"),
  // WhatsApp — mensajería y conversaciones
  list_whatsapp_numbers: R("Listar números de WhatsApp"),
  send_message: W("Enviar mensaje"),
  send_template: W("Enviar plantilla"),
  send_attachment: W("Enviar adjunto"),
  get_conversation: R("Ver conversación"),
  send_contact_card: W("Enviar tarjeta de contacto"),
  change_conversation_status: W("Cambiar estado de conversación"),
  // WhatsApp — plantillas
  list_whatsapp_templates: R("Listar plantillas"),
  get_whatsapp_template: R("Ver plantilla"),
  get_template_fields: R("Ver campos de plantilla"),
  list_templates_by_number: R("Listar plantillas por número"),
  sync_meta_templates: W("Sincronizar plantillas con Meta"),
  // WhatsApp — flows
  list_flows: R("Listar flows"),
  list_flows_by_number: R("Listar flows por número"),
  send_flow: W("Enviar flow"),
  get_flow_responses: R("Ver respuestas de flow"),
  get_flow_assets: R("Ver assets de flow"),
  get_flow_screens: R("Ver pantallas de flow"),
  // Campaigns
  list_campaigns: R("Listar campañas"),
  get_campaign: R("Ver campaña"),
  // Funnels
  list_funnels: R("Listar embudos"),
  search_contact_in_funnels: R("Buscar contacto en embudos"),
  move_contact_to_funnel_stage: W("Mover contacto de etapa"),
  // Metrics
  get_online_agents: R("Ver agentes en línea"),
  get_status_contacts: R("Ver contactos por estado"),
  get_total_campaigns: R("Ver total de campañas"),
  get_consolidated_conversations: R("Ver conversaciones consolidadas"),
  get_agent_conversations: R("Ver conversaciones por agente"),
  get_messages: R("Ver volumen de mensajes"),
  get_messages_bot: R("Ver mensajes del bot"),
  get_agent_time_response: R("Ver tiempo de respuesta del agente"),
  get_agent_transferred: R("Ver transferencias del agente"),
  get_agent_volume_of_work: R("Ver volumen de trabajo del agente"),
  get_agent_time_in_conversation: R("Ver tiempo en conversación del agente"),
  // Bot
  toggle_bot_status: W("Activar/desactivar bot"),
  // Workflow
  get_workflow_statuses: R("Ver estados de workflow"),
  // Custom fields
  list_custom_fields: R("Listar campos personalizados"),
  get_custom_field: R("Ver campo personalizado"),
  create_custom_field: W("Crear campo personalizado"),
  update_custom_field: W("Actualizar campo personalizado"),
  delete_custom_field: W("Eliminar campo personalizado"),
  // User
  get_current_user: R("Ver usuario actual"),
  // Conversations
  list_conversations: R("Listar conversaciones"),
  get_conversations_next_page: R("Siguiente página de conversaciones"),
  // Labels
  list_labels: R("Listar etiquetas"),
  search_labels: R("Buscar etiquetas"),
  get_label: R("Ver etiqueta"),
  create_label: W("Crear etiqueta"),
  update_label: W("Actualizar etiqueta"),
  delete_label: W("Eliminar etiqueta"),
  // Reports
  get_agent_performance_report: R("Reporte de desempeño por agente"),
  get_workflow_volume_report: R("Reporte de volumen de workflow"),
  get_satisfaction_survey_report: R("Reporte de satisfacción"),
};

export function getAnnotations(name: string): McpToolAnnotations {
  const src = TOOL_ANNOTATIONS[name] ?? { title: name, readOnly: false };
  return src.readOnly
    ? { title: src.title, readOnlyHint: true }
    : { title: src.title, readOnlyHint: false, destructiveHint: true };
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tests/unit/tool-annotations.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tool-annotations.ts tests/unit/tool-annotations.test.ts
git commit -m "feat: mapa central de anotaciones de tools (title + read/destructive) para el directorio"
```

---

## Task 2: Wire annotations into the tools/list response

**Files:**
- Modify: `src/server.ts`
- Modify: `tests/unit/server.test.ts`

- [ ] **Step 1: Add failing test**

Replace `tests/unit/server.test.ts` with a version that exercises the ListTools handler annotations. The current test only checks `buildServer` is defined; keep that and add annotation checks by invoking the registered request handler.

```ts
// tests/unit/server.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { buildServer } from "../../src/server.js";
import type { ToolDefinition } from "../../src/lib/register-tool.js";

const tools: ToolDefinition[] = [
  { name: "list_contacts", description: "read tool", schema: z.object({}), handler: async () => ({}) },
  { name: "delete_contact", description: "write tool", schema: z.object({}), handler: async () => ({}) },
];

async function listTools() {
  const server = buildServer(tools);
  // Access the registered ListTools handler via the server's request handler map.
  // The SDK exposes setRequestHandler; we call the handler through a fake request.
  const handler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
  return handler({ method: "tools/list", params: {} }, {} as any);
}

describe("buildServer", () => {
  it("registers tools without throwing", () => {
    expect(buildServer(tools)).toBeDefined();
  });

  it("tools/list includes annotations with title + correct hint", async () => {
    const res = await listTools();
    const byName = Object.fromEntries(res.tools.map((t: any) => [t.name, t]));
    expect(byName.list_contacts.annotations).toEqual({ title: "Listar contactos", readOnlyHint: true });
    expect(byName.delete_contact.annotations).toEqual({
      title: "Eliminar contacto",
      readOnlyHint: false,
      destructiveHint: true,
    });
  });
});
```

NOTE: if `(server as any)._requestHandlers` is not the actual internal property name in the installed SDK version, the implementer must inspect the `Server` instance to find how to invoke the registered ListTools handler (e.g. log `Object.keys(server)` / check the SDK types). The behavioral goal is: assert the ListTools response contains `annotations`. If the internal handler map is genuinely inaccessible, fall back to extracting the mapping logic into an exported pure function `buildToolList(tools)` in `server.ts` and unit-test that instead.

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/server.test.ts`

- [ ] **Step 3: Implement — update `src/server.ts`**

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { wrapHandler, type ToolDefinition } from "./lib/register-tool.js";
import { getAnnotations } from "./lib/tool-annotations.js";

// Exported so it can be unit-tested directly (pure transform).
export function buildToolList(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.schema) as any,
    annotations: getAnnotations(t.name),
  }));
}

export function buildServer(tools: ToolDefinition[]): Server {
  const server = new Server(
    { name: "wasapi-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  const handlers = new Map(tools.map((t) => [t.name, wrapHandler(t.schema, t.handler)]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: buildToolList(tools),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const fn = handlers.get(req.params.name);
    if (!fn) {
      return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
    }
    return fn(req.params.arguments ?? {});
  });

  return server;
}
```

If the `_requestHandlers` approach in the test is unreliable, rewrite the test's `listTools()` to call the exported `buildToolList(tools)` directly (simpler and deterministic):

```ts
import { buildToolList } from "../../src/server.js";
// ...
it("buildToolList includes annotations with title + correct hint", () => {
  const list = buildToolList(tools);
  const byName = Object.fromEntries(list.map((t) => [t.name, t]));
  expect(byName.list_contacts.annotations).toEqual({ title: "Listar contactos", readOnlyHint: true });
  expect(byName.delete_contact.annotations).toEqual({ title: "Eliminar contacto", readOnlyHint: false, destructiveHint: true });
});
```

Prefer the `buildToolList` direct test — it's deterministic and doesn't depend on SDK internals.

- [ ] **Step 4: Run, expect pass; then full suite**

Run: `npm test && npm run typecheck`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts tests/unit/server.test.ts
git commit -m "feat(server): adjuntar annotations (title + hints) a tools/list para el directorio"
```

---

## Task 3: Privacy policy — manifest + README

**Files:**
- Modify: `scripts/generate-manifest.mjs`, `tests/unit/generate-manifest.test.ts`, `README.md`

- [ ] **Step 1: Add failing manifest test**

In `tests/unit/generate-manifest.test.ts`, add:

```ts
  it("includes the Wasapi privacy policy URL in privacy_policies", () => {
    const m = buildManifest(pkgFixture);
    expect(m.privacy_policies).toEqual(["https://www.wasapi.io/org/politica-de-privacidad"]);
  });
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/unit/generate-manifest.test.ts`

- [ ] **Step 3: Update `scripts/generate-manifest.mjs`**

In `manifestSchema` (zod), add after `support`:
```js
  privacy_policies: z.array(z.string().url()),
```

In the returned object in `buildManifest`, add after `support`:
```js
    privacy_policies: ["https://www.wasapi.io/org/politica-de-privacidad"],
```

- [ ] **Step 4: Add the README "Privacidad" section**

Add to the table of contents (after "¿Cómo actualizo?"):
```markdown
- [Privacidad](#privacidad)
```

Add a new section before "## Limitaciones conocidas":

```markdown
## Privacidad

- El servidor MCP corre **localmente** en tu máquina (o donde lo ejecute tu cliente MCP). No es un servicio hosteado por nosotros.
- Envía tu API key y tus solicitudes **únicamente** a la API de Wasapi (`https://api-ws.wasapi.io`). No transmite datos a los autores del paquete ni a terceros.
- **No recolecta, almacena ni comparte** tus datos por su cuenta. Tu API key se guarda donde tu cliente MCP la configure (en Claude Desktop, en el keychain del sistema operativo).
- El tratamiento de los datos de tu cuenta por parte de Wasapi se rige por la [Política de Privacidad de Wasapi](https://www.wasapi.io/org/politica-de-privacidad).
- Soporte y contacto: [issues del repositorio](https://github.com/Vinix-Code-Dev/wasapi-mcp-server/issues).
```

- [ ] **Step 5: Full verification**

```bash
npm test && npm run typecheck && npm run build
npm pack --dry-run | grep -cE "(DS_Store|src/|tests/)"   # expect 0
```
Expected: ~262 tests green, typecheck/build clean, 0 leak.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-manifest.mjs tests/unit/generate-manifest.test.ts README.md
git commit -m "feat: privacy policy en manifest (privacy_policies) y sección Privacidad en README"
```

---

## Task 4: Verify annotations end-to-end in the built bundle

**Files:** none (verification only).

- [ ] **Step 1: Build and inspect the live tools/list output**

```bash
npm run build
WASAPI_API_KEY=dummy node -e '
import("./dist/server.js").then(async (m) => {
  const { allTools } = await import("./dist/tools/index.js");
  const list = m.buildToolList(allTools);
  const sample = list.filter(t => ["list_contacts","delete_contact","send_message","get_messages"].includes(t.name));
  console.log(JSON.stringify(sample.map(t => ({ name: t.name, annotations: t.annotations })), null, 2));
  const missing = list.filter(t => !t.annotations || !t.annotations.title);
  console.log("sin anotación:", missing.length);
});
'
```
Expected: `list_contacts`/`get_messages` show `readOnlyHint:true`; `delete_contact`/`send_message` show `destructiveHint:true`; `sin anotación: 0`.

- [ ] **Step 2: Verify the manifest carries privacy_policies**

```bash
npm run package:dxt
unzip -p release/wasapi-mcp-*.mcpb manifest.json | python3 -c "import json,sys; m=json.load(sys.stdin); print('privacy:', m.get('privacy_policies')); print('tools:', len(m['tools']))"
```
Expected: privacy URL present, 62 tools.

(No commit — this task is a gate before release.)

---

## Task 5: Release v1.1.0 + submission checklist

**Files:**
- Create: `docs/anthropic-submission.md`
- Operational: bump, push, publish, mcpb, release

- [ ] **Step 1: Write `docs/anthropic-submission.md`**

```markdown
# Envío al Connectors Directory de Claude — checklist

Formulario (desktop extensions / MCPB): https://clau.de/desktop-extention-submission

## Datos para el formulario
- **Nombre:** Wasapi
- **Paquete npm:** @wasapi/mcp-server
- **Repo:** https://github.com/Vinix-Code-Dev/wasapi-mcp-server
- **Artefacto .mcpb:** adjuntar `wasapi-mcp.mcpb` del release más reciente
  (https://github.com/Vinix-Code-Dev/wasapi-mcp-server/releases/latest)
- **Descripción:** Gestiona WhatsApp Business en Wasapi desde Claude: contactos, mensajes, plantillas, flows, campañas, embudos, métricas y reportes (62 herramientas).
- **Política de privacidad:** https://www.wasapi.io/org/politica-de-privacidad
- **Soporte:** https://github.com/Vinix-Code-Dev/wasapi-mcp-server/issues

## Requisitos cumplidos (auto-checklist)
- [x] Todas las tools con `title` + `readOnlyHint`/`destructiveHint` (ver src/lib/tool-annotations.ts; 40 read / 22 write)
- [x] Tools granulares (sin catch-all read+write)
- [x] Descripciones factuales, sin instrucciones al modelo
- [x] `privacy_policies` en el manifest + sección Privacidad en README
- [x] Documentación: instalación, auth, ≥3 prompts de ejemplo, limitaciones, soporte
- [x] manifest_version 0.3

## Lo que debe proveer el remitente al reviewer
- Una **API key de prueba de Wasapi con datos de ejemplo** (contactos, alguna conversación/plantilla) para que el reviewer pueda ejercitar las tools.
- Confirmar que el `.mcpb` adjunto es el del release que coincide con la versión publicada en npm.
```

- [ ] **Step 2: Bump + push (controller); publish is the user's)**

```bash
npm version minor   # 1.0.0 → 1.1.0
git push --follow-tags
```

- [ ] **Step 3: User publishes**

```bash
npm publish --access public --otp=<código>
```

- [ ] **Step 4: Build MCPB + verify**

```bash
npm run package:dxt
unzip -p release/wasapi-mcp-1.1.0.mcpb manifest.json | python3 -c "import json,sys; m=json.load(sys.stdin); print(m['version'], len(m['tools']), m.get('privacy_policies'))"
cp release/wasapi-mcp-1.1.0.mcpb ~/Desktop/wasapi-mcp.mcpb
```

- [ ] **Step 5: GitHub release**

```bash
gh release create v1.1.0 release/wasapi-mcp-1.1.0.mcpb release/wasapi-mcp.mcpb \
  --repo Vinix-Code-Dev/wasapi-mcp-server \
  --title "v1.1.0 — Listo para el Connectors Directory" \
  --notes "Anotaciones de seguridad en las 62 herramientas (read-only/destructive) y política de privacidad — requisitos del directorio de Claude. Sin cambios funcionales."
```

- [ ] **Step 6: User submits the form** at https://clau.de/desktop-extention-submission using `docs/anthropic-submission.md`.
