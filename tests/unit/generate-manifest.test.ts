// tests/unit/generate-manifest.test.ts
import { describe, it, expect } from "vitest";
import { buildManifest, manifestSchema } from "../../scripts/generate-manifest.mjs";

const pkgFixture = {
  name: "@jpabloe/wasapi-mcp-server",
  version: "0.3.0",
  description: "MCP server for Wasapi — manage contacts and send WhatsApp messages via Claude",
  author: { name: "Juan Pablo", email: "juanpablo@vinixcode.com", url: "https://github.com/juanpablo-estrada" },
  repository: { type: "git", url: "git+https://github.com/juanpablo-estrada/wasapi-mcp-server.git" },
  license: "ISC",
};

describe("buildManifest", () => {
  it("syncs version from package.json", () => {
    const m = buildManifest(pkgFixture);
    expect(m.version).toBe("0.3.0");
  });

  it("uses author info from package.json", () => {
    const m = buildManifest(pkgFixture);
    expect(m.author.name).toBe("Juan Pablo");
    expect(m.author.email).toBe("juanpablo@vinixcode.com");
  });

  it("declares all 62 tools", () => {
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
      "list_campaigns", "get_campaign",
      "list_funnels", "search_contact_in_funnels", "move_contact_to_funnel_stage",
      "get_online_agents", "get_status_contacts", "get_total_campaigns",
      "get_consolidated_conversations", "get_agent_conversations", "get_messages",
      "get_messages_bot", "get_agent_time_response", "get_agent_transferred",
      "get_agent_volume_of_work", "get_agent_time_in_conversation",
      "toggle_bot_status",
      "get_workflow_statuses",
      "list_custom_fields", "get_custom_field", "create_custom_field",
      "update_custom_field", "delete_custom_field",
      "get_current_user",
      "list_conversations", "get_conversations_next_page",
      "list_labels", "search_labels", "get_label",
      "create_label", "update_label", "delete_label",
      "get_agent_performance_report", "get_workflow_volume_report", "get_satisfaction_survey_report",
    ]);
  });

  it("api_key user_config is sensitive and required", () => {
    const m = buildManifest(pkgFixture);
    expect(m.user_config.api_key.sensitive).toBe(true);
    expect(m.user_config.api_key.required).toBe(true);
  });

  it("server entry_point and mcp_config wire API key through env", () => {
    const m = buildManifest(pkgFixture);
    expect(m.server.entry_point).toBe("dist/index.js");
    expect(m.server.mcp_config.command).toBe("node");
    expect(m.server.mcp_config.args).toEqual(["${__dirname}/dist/index.js"]);
    expect(m.server.mcp_config.env.WASAPI_API_KEY).toBe("${user_config.api_key}");
  });

  it("output passes manifestSchema validation", () => {
    const m = buildManifest(pkgFixture);
    expect(() => manifestSchema.parse(m)).not.toThrow();
  });

  it("manifestSchema rejects a manifest missing required fields", () => {
    expect(() => manifestSchema.parse({ name: "x" })).toThrow();
  });

  it("derives homepage/documentation/support from repository URL", () => {
    const m = buildManifest(pkgFixture);
    expect(m.homepage).toBe("https://github.com/juanpablo-estrada/wasapi-mcp-server");
    expect(m.documentation).toBe("https://github.com/juanpablo-estrada/wasapi-mcp-server#readme");
    expect(m.support).toBe("https://github.com/juanpablo-estrada/wasapi-mcp-server/issues");
  });

  it("normalizes SCP-style SSH repository URLs (git@host:user/repo.git)", () => {
    const m = buildManifest({
      ...pkgFixture,
      repository: { type: "git", url: "git@github.com:juanpablo-estrada/wasapi-mcp-server.git" },
    });
    expect(m.homepage).toBe("https://github.com/juanpablo-estrada/wasapi-mcp-server");
    expect(() => manifestSchema.parse(m)).not.toThrow();
  });

  it("normalizes ssh:// repository URLs", () => {
    const m = buildManifest({
      ...pkgFixture,
      repository: { type: "git", url: "ssh://git@github.com/juanpablo-estrada/wasapi-mcp-server.git" },
    });
    expect(m.homepage).toBe("https://github.com/juanpablo-estrada/wasapi-mcp-server");
  });

  it("falls back to default homepage when repository is missing", () => {
    const { repository, ...pkgNoRepo } = pkgFixture;
    const m = buildManifest(pkgNoRepo);
    expect(m.homepage).toBe("https://github.com/juanpablo-estrada/wasapi-mcp-server");
    expect(() => manifestSchema.parse(m)).not.toThrow();
  });

  it("handles string-form author", () => {
    const m = buildManifest({ ...pkgFixture, author: "Solo Name" });
    expect(m.author).toEqual({ name: "Solo Name" });
    expect(() => manifestSchema.parse(m)).not.toThrow();
  });

  it("manifestSchema rejects user_config with sensitive: false", () => {
    const m = buildManifest(pkgFixture);
    const bad = {
      ...m,
      user_config: { api_key: { ...m.user_config.api_key, sensitive: false } },
    };
    expect(() => manifestSchema.parse(bad)).toThrow();
  });
});
