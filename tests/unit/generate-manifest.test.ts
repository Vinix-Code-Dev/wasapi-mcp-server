// tests/unit/generate-manifest.test.ts
import { describe, it, expect } from "vitest";
import { buildManifest, manifestSchema } from "../../scripts/generate-manifest.mjs";

const pkgFixture = {
  name: "@jpabloe/wasapi-mcp-server",
  version: "0.3.0",
  description: "MCP server for Wasapi — manage contacts and send WhatsApp messages via Claude",
  author: { name: "Juan Pablo", email: "juanpablo@vinixcode.com", url: "https://github.com/jpabloe" },
  repository: { type: "git", url: "git+https://github.com/jpabloe/wasapi-mcp-server.git" },
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

  it("declares all 12 tools", () => {
    const m = buildManifest(pkgFixture);
    const names = m.tools.map((t) => t.name);
    expect(names).toEqual([
      "list_contacts", "get_contact", "create_contact", "update_contact",
      "delete_contact", "add_label_to_contact", "remove_label_from_contact",
      "list_whatsapp_numbers", "send_message", "send_template",
      "send_attachment", "get_conversation",
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
    expect(m.homepage).toBe("https://github.com/jpabloe/wasapi-mcp-server");
    expect(m.documentation).toBe("https://github.com/jpabloe/wasapi-mcp-server#readme");
    expect(m.support).toBe("https://github.com/jpabloe/wasapi-mcp-server/issues");
  });
});
