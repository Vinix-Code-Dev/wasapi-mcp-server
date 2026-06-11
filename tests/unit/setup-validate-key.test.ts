import { describe, it, expect, vi } from "vitest";
import { validateKey } from "../../src/setup/validate-key.js";

describe("validateKey", () => {
  it("returns ok with numbers on success", async () => {
    const fakeClient = {
      whatsapp: { getWhatsappNumbers: vi.fn().mockResolvedValue([{ id: 1, phone: "+57..." }]) },
    };
    const r = await validateKey("good_key", { clientFactory: () => fakeClient });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.numbers).toHaveLength(1);
  });

  it("unwraps { data: [...] } envelope shape", async () => {
    const fakeClient = {
      whatsapp: { getWhatsappNumbers: vi.fn().mockResolvedValue({ data: [{ id: 9 }] }) },
    };
    const r = await validateKey("k", { clientFactory: () => fakeClient });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.numbers[0].id).toBe(9);
  });

  it("returns auth error on 401", async () => {
    const err = { isAxiosError: true, response: { status: 401 } };
    const fakeClient = {
      whatsapp: { getWhatsappNumbers: vi.fn().mockRejectedValue(err) },
    };
    const r = await validateKey("bad", { clientFactory: () => fakeClient });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.category).toBe("auth");
      expect(r.message).toMatch(/API key/);
    }
  });

  it("returns network error when no response", async () => {
    const err = { isAxiosError: true, code: "ECONNREFUSED" };
    const fakeClient = {
      whatsapp: { getWhatsappNumbers: vi.fn().mockRejectedValue(err) },
    };
    const r = await validateKey("k", { clientFactory: () => fakeClient });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe("network");
  });
});
