# SDK Surface (verified)

SDK: `@wasapi/js-sdk`
Source: `node_modules/@wasapi/js-sdk/dist/types/wasapi/modules/*.d.ts`
Inspected: 2026-06-12 (post SDK-parity batch A+B, 27 tools)

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

## labels (`client.labels`)

Methods: `getAll()`, `getSearch(name)`, `getById(id)`, `create({ title, description, color })`, `update({ id, data })`, `delete(id)`

Labels are managed separately — not exposed as MCP tools in this version.

---

## Important notes

### `recipients` is CSV at the API level
The SDK's `sendTemplate` accepts `recipients` as a comma-separated string (e.g. `"573001112233,573002223344"`). The MCP tool accepts `recipients: string[]` for model ergonomics and joins with `","` in the handler before calling the SDK.

### Methods returning `any`
Three SDK methods return `any` in their type declarations — the actual shape must be inferred from runtime observations:
- `getFieldsTemplate(template_uuid)` → observed: `{ fields: [...] }`
- `getFlowsByPhoneId(from_id?)` → observed: `{ data: [...] }` or similar
- `getFlowScreens({ flow_id, phone_id? })` → observed: `{ screens: [...] }` or similar

### Campaigns module (stub — DO NOT USE)
The `campaigns` module has `create`, `update`, and `delete` methods that **throw "not implemented"** at runtime. They are present in the SDK class but are stubs. Do not expose them as MCP tools until the SDK implements them.

### `listConversations` does not exist
There is no `listConversations` or equivalent method in the `whatsapp` module. Only `getConversation({ wa_id, from_id?, page? })` exists (retrieves single conversation thread). This is a known gap.

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
