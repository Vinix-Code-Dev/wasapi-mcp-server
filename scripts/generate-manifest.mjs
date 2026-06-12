// scripts/generate-manifest.mjs
import { z } from "zod";

const TOOLS = [
  { name: "list_contacts", description: "List contacts (paginated, optional search)" },
  { name: "get_contact", description: "Fetch a contact by wa_id" },
  { name: "create_contact", description: "Create a new contact" },
  { name: "update_contact", description: "Update an existing contact" },
  { name: "delete_contact", description: "Delete a contact" },
  { name: "add_label_to_contact", description: "Attach a label to a contact" },
  { name: "remove_label_from_contact", description: "Detach a label from a contact" },
  { name: "list_whatsapp_numbers", description: "List WhatsApp numbers connected to the account" },
  { name: "send_message", description: "Send a plain-text WhatsApp message" },
  { name: "send_template", description: "Send an approved WhatsApp template" },
  { name: "send_attachment", description: "Send a file attachment from a local path" },
  { name: "get_conversation", description: "Fetch the message thread with a contact" },
];

export const manifestSchema = z.object({
  dxt_version: z.literal("0.1"),
  name: z.string().min(1),
  display_name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().min(1),
  long_description: z.string().min(1),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
  homepage: z.string().url(),
  documentation: z.string().url(),
  support: z.string().url(),
  license: z.string(),
  keywords: z.array(z.string()),
  icon: z.string(),
  server: z.object({
    type: z.literal("node"),
    entry_point: z.string(),
    mcp_config: z.object({
      command: z.string(),
      args: z.array(z.string()),
      env: z.record(z.string(), z.string()),
    }),
  }),
  user_config: z.record(
    z.string(),
    z.object({
      type: z.string(),
      title: z.string(),
      description: z.string(),
      sensitive: z.boolean().optional(),
      required: z.boolean().optional(),
    }),
  ),
  tools: z.array(z.object({ name: z.string(), description: z.string() })),
  compatibility: z.object({
    claude_desktop: z.string(),
    platforms: z.array(z.string()),
    runtimes: z.record(z.string(), z.string()),
  }),
});

function repoUrlToHttps(url) {
  if (!url) return "https://github.com/jpabloe/wasapi-mcp-server";
  return url
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\/git@/, "https://")
    .replace(/\.git$/, "");
}

export function buildManifest(pkg) {
  const homepage = repoUrlToHttps(pkg.repository?.url);
  const author = typeof pkg.author === "string"
    ? { name: pkg.author }
    : (pkg.author ?? { name: "Unknown" });

  return {
    dxt_version: "0.1",
    name: "wasapi-mcp",
    display_name: "Wasapi",
    version: pkg.version,
    description: "Manage WhatsApp contacts and send messages via your Wasapi account",
    long_description: "Connects Claude to your Wasapi WhatsApp Business account. Send messages, manage contacts, fetch conversations — all in natural language. Get your API key at https://app.wasapi.io/account/developer",
    author,
    homepage,
    documentation: `${homepage}#readme`,
    support: `${homepage}/issues`,
    license: pkg.license ?? "ISC",
    keywords: ["wasapi", "whatsapp", "messaging", "crm"],
    icon: "icon.png",
    server: {
      type: "node",
      entry_point: "dist/index.js",
      mcp_config: {
        command: "node",
        args: ["${__dirname}/dist/index.js"],
        env: { WASAPI_API_KEY: "${user_config.api_key}" },
      },
    },
    user_config: {
      api_key: {
        type: "string",
        title: "Wasapi API Key",
        description: "Tu API key personal. Consíguela en https://app.wasapi.io/account/developer",
        sensitive: true,
        required: true,
      },
    },
    tools: TOOLS,
    compatibility: {
      claude_desktop: ">=0.10.0",
      platforms: ["darwin", "win32", "linux"],
      runtimes: { node: ">=20.0.0" },
    },
  };
}
