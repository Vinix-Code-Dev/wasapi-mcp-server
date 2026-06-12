import { describe, it, expect, vi, beforeEach } from "vitest";
import { changeStatusTool } from "../../../src/tools/whatsapp/change-status.js";
import { sendContactCardTool } from "../../../src/tools/whatsapp/send-contact-card.js";
import { wrapHandler } from "../../../src/lib/register-tool.js";

const mocks = {
  changeStatus: vi.fn().mockResolvedValue({ success: true }),
  sendContacts: vi.fn().mockResolvedValue({ success: true, contacts_sent: 1 }),
};
vi.mock("../../../src/wasapi.js", () => ({
  getClient: () => ({ whatsapp: mocks }),
}));

describe("change_conversation_status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WASAPI_API_KEY = "test";
    process.env.WASAPI_FROM_ID = "10";
  });

  it("changes status with from_id fallback", async () => {
    const h = wrapHandler(changeStatusTool.schema, changeStatusTool.handler);
    const res = await h({ wa_id: "573001", status: "closed" });
    expect(res.isError).toBeFalsy();
    expect(mocks.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ wa_id: "573001", status: "closed", from_id: 10 }),
    );
  });

  it("rejects invalid status", async () => {
    const h = wrapHandler(changeStatusTool.schema, changeStatusTool.handler);
    expect((await h({ wa_id: "573001", status: "archived" })).isError).toBe(true);
  });
});

describe("send_contact_card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WASAPI_API_KEY = "test";
    process.env.WASAPI_FROM_ID = "10";
  });

  it("sends a contact card", async () => {
    const h = wrapHandler(sendContactCardTool.schema, sendContactCardTool.handler);
    const res = await h({
      wa_id: "573001",
      contacts: [{ name: { first_name: "Ana" }, phones: [{ phone: "+573001112233", type: "CELL" }] }],
    });
    expect(res.isError).toBeFalsy();
    expect(mocks.sendContacts).toHaveBeenCalledWith(
      expect.objectContaining({ wa_id: "573001", from_id: 10 }),
    );
  });

  it("rejects empty contacts array", async () => {
    const h = wrapHandler(sendContactCardTool.schema, sendContactCardTool.handler);
    expect((await h({ wa_id: "573001", contacts: [] })).isError).toBe(true);
  });
});
