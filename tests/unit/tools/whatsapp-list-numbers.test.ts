// tests/unit/tools/whatsapp-list-numbers.test.ts
import { describe, it, expect, vi } from "vitest";
import { listWhatsappNumbersTool } from "../../../src/tools/whatsapp/list-numbers.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const getWhatsappNumbersMock = vi.fn().mockResolvedValue([
  { from_id: 1, phone: "+57300..." },
]);
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: { getWhatsappNumbers: getWhatsappNumbersMock } }),
}));

describe("list_whatsapp_numbers", () => {
  it("returns whatsapp numbers list", async () => {
    const h = wrapHandler(listWhatsappNumbersTool.schema, listWhatsappNumbersTool.handler);
    const res = await h({});
    expect(res.isError).toBeFalsy();
    const body = JSON.parse(res.content[0].text);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].from_id).toBe(1);
    expect(getWhatsappNumbersMock).toHaveBeenCalledWith();
  });
});
