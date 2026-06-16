# SDK Surface (verified)

SDK: `@wasapi/js-sdk` — **2.0.0**
Source: `node_modules/@wasapi/js-sdk/dist/types/wasapi/modules/*.d.ts`
Inspected: 2026-06-16 (post conversations/labels/reports batch, 62 tools)

## Init

```ts
new WasapiClient(config: WasapiConfig | string)
// WasapiConfig = { apiKey: string; baseURL?: string; from_id?: number }
// or pass apiKey string directly
```

---

## contacts (`client.contacts`)

Full method surface:

| Method | Signature | Return type | Notes |
|---|---|---|---|
| `getAll` | `()` | `Promise<ResponseAllContacts>` | No pagination params |
| `getSearch` | `({ search?, labels?, page? })` | `Promise<ResponseAllContacts>` | |
| `getById` | `(wa_id: string)` | `Promise<ResponseContactById>` | |
| `create` | `({ first_name, last_name, email, country_code, phone, ...options })` | `Promise<ResponseContactById>` | `first_name` required |
| `update` | `({ wa_id, data })` | `Promise<ResponseContactById>` | |
| `delete` | `(wa_id: string)` | `Promise<any>` | |
| `addLabel` | `({ contact_uuid, label_id })` | `Promise<ResponseContactById>` | |
| `removeLabel` | `({ contact_uuid, label_id })` | `Promise<ResponseContactById>` | |
| `assingAgentAutomatic` | `({ contact_uuid })` | `Promise<ResponseContactById>` | Note: typo in SDK name ("assing" not "assign") |
| `export` | `(data: ExportContactsRequest)` | `Promise<void>` | Triggers async export; no return value |

---

## whatsapp (`client.whatsapp`)

Full method surface:

| Method | Signature | Return type | Notes |
|---|---|---|---|
| `sendMessage` | `({ from_id?, wa_id, message })` | `Promise<ResponseMessageWPP>` | |
| `sendAttachment` | `({ from_id?, wa_id, filePath, caption?, filename? })` | `Promise<ResponseAttachmentWPP>` | Local file path only; no remote URL support at SDK level |
| `sendTemplate` | `({ recipients, template_id, contact_type, from_id?, url_file?, ...options })` | `Promise<ResponseTemplate>` | `recipients` is a **CSV string** at the API level (e.g. `"573001,573002"`). The MCP tool accepts `string[]` and joins with `","`. `url_file` triggers `getTemplateFileType` internally — do NOT pass a `file` param |
| `getConversation` | `({ wa_id, from_id?, page? })` | `Promise<ResponseConversation>` | |
| `getWhatsappNumbers` | `()` | `Promise<ResponseWhatsappNumbers>` | |
| `getWhatsappTemplates` | `()` | `Promise<ResponseTemplate>` | |
| `getWhatsappTemplate` | `({ template_uuid })` | `Promise<ResponseTemplateById>` | |
| `getFieldsTemplate` | `(template_uuid: string)` | `Promise<any>` | Returns `any` in SDK types; observed shape: `{ fields: [...] }` |
| `getTemplatesByAppId` | `({ from_id })` | `Promise<Template[]>` | |
| `syncMetaTemplates` | `()` | `Promise<ResponseTemplateSyncMeta>` | |
| `changeStatus` | `({ from_id, wa_id, status, message?, ...options })` | `Promise<any>` | `status` values: `"open"`, `"hold"`, `"closed"` |
| `sendContacts` | `({ wa_id, from_id, context_wam_id?, contacts })` | `Promise<ResponseSendContact>` | Sends vCard contact cards |
| `getFlows` | `()` | `Promise<ResponseAllFlows>` | |
| `getFlowsByPhoneId` | `(from_id?: number)` | `Promise<any>` | Returns `any` in SDK types; takes positional arg (not object) |
| `sendFlow` | `({ wa_id, message, phone_id, cta, screen, flow_id, action? })` | `Promise<ResponseSendFlow>` | |
| `getFlowResponses` | `({ flow_id, page?, per_page? })` | `Promise<ResponseFlowResponses>` | |
| `getFlowAssets` | `({ flow_id, phone_id? })` | `Promise<GetFlowDetail>` | |
| `getFlowScreens` | `({ flow_id, phone_id? })` | `Promise<any>` | Returns `any` in SDK types; same params as `getFlowAssets` |
| `getAppIdByFromId` | `(from_id: number)` | `Promise<any>` | Internal utility; not exposed as MCP tool |

---

## conversations (`client.conversations`)

Full method surface (SDK 2.0.0):

| Method | Signature | Notes |
|---|---|---|
| `getAll` | `(params?: GetConversationsParams)` | All params optional; see filters table |
| `getNextPage` | `(cursor: string, params?: Omit<GetConversationsParams,'cursor'>)` | cursor is positional first arg |

`GetConversationsParams` optional fields: `query`, `search_type` ('contactName'\|'all'), `status` ('open'\|'hold'\|'closed'), `phones`, `labels`, `agents`, `dates` (YYYY-MM-DD,YYYY-MM-DD), `without_labels` (boolean), `open_options` ('0'–'3'), `order_conversations` ('0'\|'1'), `all_agents` (boolean), `cursor`, `per_page` (number).

MCP tools: `list_conversations` (getAll), `get_conversations_next_page` (getNextPage).

---

## labels (`client.labels`)

Full method surface (SDK 2.0.0):

| Method | Signature | Notes |
|---|---|---|
| `getAll` | `()` | Returns all labels |
| `getSearch` | `(name: string)` | Positional arg |
| `getById` | `(id: string)` | Positional arg |
| `create` | `({ title, description?, color })` | color required |
| `update` | `({ id, data: { title, description?, color } })` | |
| `delete` | `(id: string)` | Positional arg |

MCP tools: `list_labels`, `search_labels`, `get_label`, `create_label`, `update_label`, `delete_label`.

---

## reports (`client.reports`)

Full method surface (SDK 2.0.0):

| Method | Signature | Notes |
|---|---|---|
| `getPerformanceByAgent` | `({ start_date, end_date, agent_id? })` | agent_id is optional filter |
| `getVolumeOfWorkflow` | `({ start_date, end_date, from_id? })` | from_id is optional filter |
| `getSatisfactionSurvey` | `({ start_date, end_date, agent_id? })` | agent_id is optional filter |

MCP tools: `get_agent_performance_report`, `get_workflow_volume_report`, `get_satisfaction_survey_report`.

---

## Important notes

### `recipients` is CSV at the API level
The SDK's `sendTemplate` accepts `recipients` as a comma-separated string (e.g. `"573001112233,573002223344"`). The MCP tool accepts `recipients: string[]` for model ergonomics and joins with `","` in the handler before calling the SDK.

### Methods returning `any`
Three SDK methods return `any` in their type declarations — the actual shape must be inferred from runtime observations:
- `getFieldsTemplate(template_uuid)` → observed: `{ fields: [...] }`
- `getFlowsByPhoneId(from_id?)` → observed: `{ data: [...] }` or similar
- `getFlowScreens({ flow_id, phone_id? })` → returns a plain `Screen[]` array — the SDK implementation extracts `getFlowAssets().data.screens` internally (see `dist/esm/wasapi/modules/whatsapp.js`)

### Campaigns module (stub — DO NOT USE)
The `campaigns` module has `create`, `update`, and `delete` methods that **throw "not implemented"** at runtime. They are present in the SDK class but are stubs. Do not expose them as MCP tools until the SDK implements them.

### `listConversations` gap — now resolved (SDK 2.0.0)
The `whatsapp` module still only exposes `getConversation({ wa_id, from_id?, page? })` (single conversation thread). The list-conversations capability is provided by the new `conversations` module (`client.conversations`): `getAll(params?)` and `getNextPage(cursor, params?)`. MCP tools `list_conversations` and `get_conversations_next_page` are built on these methods.

### funnels module (`client.funnels`)
| Method | Params (SDK camelCase) | MCP tool |
|---|---|---|
| `getAll()` | — | `list_funnels` |
| `searchContact({ phoneNumber?, contactUuid? })` | at least one | `search_contact_in_funnels` |
| `moveContactToFunnel({ funnelContactId, toStageId })` | both required | `move_contact_to_funnel_stage` |

### metrics module (`client.metrics`)
11 public methods (a 12th, `getAgentMetric`, is private and used internally by the per-agent wrappers). No-arg: `getOnlineAgents()`, `getStatusContacts()`. Date-range `{ startDate, endDate }`: `getTotalCampaigns`, `getConsolidatedConversations`, `getAgentConversations`, `getMessages`, `getMessagesBot`. Per-agent `{ agentId, startDate, endDate }`: `getAgentTimeResponse`, `getAgentTransferred`, `getAgentVolumeOfWork`, `getAgentTimeInConversation`.

**Date format (confirmed against live API, 2026-06-14):** `YYYY-MM-DD`. The SDK inserts the values straight into the query string (`?dates[]=${startDate}&dates[]=${endDate}` for dashboard metrics; `start`/`end` for per-agent `/metrics`). A wide range (e.g. `2026-01-01` to `2026-06-30`) works as expected.

### bot module (`client.bot`)
| Method | Params | MCP tool |
|---|---|---|
| `toggleStatus({ wa_id, data: { from_id, action } })` | action ∈ enable\|disable\|disable_permanently | `toggle_bot_status` |

### workflow module (`client.workflow`)
| Method | Params (all optional) | MCP tool |
|---|---|---|
| `getStatuses({ action?, phone?, agent_id?, dates?, per_page?, page? })` | snake_case; `dates` is a `YYYY-MM-DD,YYYY-MM-DD` string | `get_workflow_statuses` |

**Workflow quirks (confirmed benign against live API, 2026-06-14):** the SDK (a) calls `console.log(response.data)` — already redirected to stderr since v0.2, so it does not corrupt MCP stdio; (b) interpolates omitted params as the literal string `"undefined"` in the URL. The live API **tolerates** the `"undefined"` garbage gracefully — it returns a valid paginated empty response (`{ data: [], total: 0 }`, HTTP 200) and the response `path` is clean. No workaround needed.

### customFields module (`client.customFields`)
| Method | Params | MCP tool |
|---|---|---|
| `getAll()` | — | `list_custom_fields` |
| `getById(id)` | positional string | `get_custom_field` |
| `create({ name })` | — | `create_custom_field` |
| `update({ id, data: { name } })` | — | `update_custom_field` |
| `delete(id)` | positional string | `delete_custom_field` |

### user module (`client.user`)
| Method | Params | MCP tool |
|---|---|---|
| `getUser()` | — | `get_current_user` |

---

## Response type aliases

| Type | Module |
|---|---|
| `ResponseAllContacts` | contacts |
| `ResponseContactById` | contacts |
| `ResponseWhatsappNumbers` | whatsapp |
| `ResponseMessageWPP` | whatsapp |
| `ResponseTemplate` | whatsapp |
| `ResponseTemplateById` | whatsapp |
| `ResponseTemplateSyncMeta` | whatsapp |
| `ResponseAttachmentWPP` | whatsapp |
| `ResponseConversation` | whatsapp |
| `ResponseSendContact` | whatsapp |
| `ResponseAllFlows` | whatsapp |
| `ResponseSendFlow` | whatsapp |
| `ResponseFlowResponses` | whatsapp |
| `GetFlowDetail` | whatsapp |
