# SDK Surface (verified)

SDK: `@wasapi/js-sdk` v0.1.38
Inspected: 2026-06-10

## Init

```ts
new WasapiClient(config: WasapiConfig | string)
// WasapiConfig = { apiKey: string; baseURL?: string; from_id?: number }
// or pass apiKey string directly
```

## contacts (`client.contacts`)

| Plan assumption | Actual SDK method | Notes |
|---|---|---|
| `contacts.list(args)` | `contacts.getAll()` | No pagination params accepted |
| `contacts.list({ search })` | `contacts.getSearch({ search?, labels?, page? })` | Search is separate method |
| `contacts.get(id)` | `contacts.getById(wa_id: string)` | ID is `wa_id` (string), not numeric |
| `contacts.create(args)` | `contacts.create({ first_name, last_name, email, country_code, phone, ...options })` | `first_name` is required |
| `contacts.update(id, data)` | `contacts.update({ wa_id, data })` | Takes object, not two args |
| `contacts.delete(id)` | `contacts.delete(wa_id: string)` | ID is string |
| `contacts.addLabel(id, labelId)` | `contacts.addLabel({ contact_uuid, label_id: number[] })` | Different signature — takes object, label_id is array |
| `contacts.removeLabel(id, labelId)` | `contacts.removeLabel({ contact_uuid, label_id: number[] })` | Same |

## whatsapp (`client.whatsapp`)

| Plan assumption | Actual SDK method | Notes |
|---|---|---|
| `whatsapp.listNumbers()` | `whatsapp.getWhatsappNumbers()` | Different name |
| `whatsapp.sendMessage({ to, message, from_id })` | `whatsapp.sendMessage({ from_id?, wa_id, message })` | Uses `wa_id` not `to` |
| `whatsapp.sendTemplate({ to, template_name, variables, from_id })` | `whatsapp.sendTemplate({ recipients, template_id, contact_type, from_id?, ... })` | Completely different shape — template_id (UUID) instead of name, recipients instead of to, contact_type required |
| `whatsapp.sendAttachment({ to, url, type, caption, from_id })` | `whatsapp.sendAttachment({ from_id?, wa_id, filePath, caption?, filename? })` | Takes `filePath` (local or URL?), no explicit type enum; different params |
| `whatsapp.listConversations(args)` | NOT FOUND | No `listConversations` method exists |
| `whatsapp.getConversation(id)` | `whatsapp.getConversation({ wa_id, from_id?, page? })` | Takes object with `wa_id`, not a conversation ID |

## labels (`client.labels`)

Methods: `getAll()`, `getSearch(name)`, `getById(id)`, `create({ title, description, color })`, `update({ id, data })`, `delete(id)`

Labels are managed separately — they are NOT attached/detached via the contacts module with a simple (contactId, labelId) signature.

## Key discrepancies affecting Tasks 7–17

1. **contacts.list** does not exist — use `getAll()` (no args) or `getSearch({ search?, labels?, page? })`
2. **contacts.get** → `getById(wa_id: string)` — ID is a string wa_id
3. **contacts.update** → `update({ wa_id, data })` — object signature, `wa_id` is string
4. **contacts.delete** → `delete(wa_id: string)` — string
5. **contacts.addLabel** → `addLabel({ contact_uuid, label_id: number[] })` — object, label_id is array
6. **contacts.removeLabel** → `removeLabel({ contact_uuid, label_id: number[] })` — same
7. **whatsapp.listNumbers** → `getWhatsappNumbers()`
8. **whatsapp.sendMessage** uses `wa_id` not `to`
9. **whatsapp.sendTemplate** has completely different shape (template_id UUID, recipients, contact_type)
10. **whatsapp.sendAttachment** uses `filePath` not `url`+`type`
11. **whatsapp.listConversations** does NOT exist
12. **whatsapp.getConversation** takes `{ wa_id, from_id?, page? }` not a conversation ID

## Response shapes

- `contacts.getAll()` → `ResponseAllContacts`
- `contacts.getById()` → `ResponseContactById`
- `whatsapp.getWhatsappNumbers()` → `ResponseWhatsappNumbers`
- `whatsapp.sendMessage()` → `ResponseMessageWPP`
- `whatsapp.sendTemplate()` → `ResponseTemplate`
- `whatsapp.sendAttachment()` → `ResponseAttachmentWPP`
- `whatsapp.getConversation()` → `ResponseConversation`
