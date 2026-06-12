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

  it("works with no args and passes empty object to the SDK", async () => {
    const h = wrapHandler(exportContactsTool.schema, exportContactsTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    expect(mock).toHaveBeenCalledWith({});
  });

  it("rejects invalid email", async () => {
    const h = wrapHandler(exportContactsTool.schema, exportContactsTool.handler);
    const res = await h({ email_urls: ["not-an-email"] });
    expect(res.isError).toBe(true);
  });
});
