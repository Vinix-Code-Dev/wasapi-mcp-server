// tests/contracts/sdk-shapes.test.ts
// Type-level contract tests. These compile-fail if the SDK shape drifts.
// They verify the exact method names used by our tool handlers.
import { describe, it, expectTypeOf } from "vitest";
import type { WasapiClient } from "@wasapi/js-sdk";

describe("SDK shape contracts — contacts", () => {
  it("contacts.getSearch is a function", () => {
    type Fn = WasapiClient["contacts"]["getSearch"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("contacts.getById is a function", () => {
    type Fn = WasapiClient["contacts"]["getById"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("contacts.create is a function", () => {
    type Fn = WasapiClient["contacts"]["create"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("contacts.update is a function", () => {
    type Fn = WasapiClient["contacts"]["update"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("contacts.delete is a function", () => {
    type Fn = WasapiClient["contacts"]["delete"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("contacts.addLabel is a function", () => {
    type Fn = WasapiClient["contacts"]["addLabel"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("contacts.removeLabel is a function", () => {
    type Fn = WasapiClient["contacts"]["removeLabel"];
    expectTypeOf<Fn>().toBeFunction();
  });
});

describe("SDK shape contracts — whatsapp", () => {
  it("whatsapp.getWhatsappNumbers is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getWhatsappNumbers"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.sendMessage is a function", () => {
    type Fn = WasapiClient["whatsapp"]["sendMessage"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.sendTemplate is a function", () => {
    type Fn = WasapiClient["whatsapp"]["sendTemplate"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.sendAttachment is a function", () => {
    type Fn = WasapiClient["whatsapp"]["sendAttachment"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getConversation is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getConversation"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getWhatsappTemplates is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getWhatsappTemplates"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getWhatsappTemplate is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getWhatsappTemplate"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getFieldsTemplate is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getFieldsTemplate"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getTemplatesByAppId is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getTemplatesByAppId"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.syncMetaTemplates is a function", () => {
    type Fn = WasapiClient["whatsapp"]["syncMetaTemplates"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.changeStatus is a function", () => {
    type Fn = WasapiClient["whatsapp"]["changeStatus"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.sendContacts is a function", () => {
    type Fn = WasapiClient["whatsapp"]["sendContacts"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getFlows is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getFlows"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getFlowsByPhoneId is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getFlowsByPhoneId"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.sendFlow is a function", () => {
    type Fn = WasapiClient["whatsapp"]["sendFlow"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getFlowResponses is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getFlowResponses"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getFlowAssets is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getFlowAssets"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("whatsapp.getFlowScreens is a function", () => {
    type Fn = WasapiClient["whatsapp"]["getFlowScreens"];
    expectTypeOf<Fn>().toBeFunction();
  });
});

describe("SDK shape contracts — contacts (new methods)", () => {
  it("contacts.assingAgentAutomatic is a function", () => {
    type Fn = WasapiClient["contacts"]["assingAgentAutomatic"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("contacts.export is a function", () => {
    type Fn = WasapiClient["contacts"]["export"];
    expectTypeOf<Fn>().toBeFunction();
  });
});

describe("SDK shape contracts — campaigns", () => {
  it("campaigns.getAll is a function", () => {
    type Fn = WasapiClient["campaigns"]["getAll"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("campaigns.getById is a function", () => {
    type Fn = WasapiClient["campaigns"]["getById"];
    expectTypeOf<Fn>().toBeFunction();
  });
});

describe("SDK shape contracts — funnels", () => {
  it("funnels.getAll is a function", () => {
    type Fn = WasapiClient["funnels"]["getAll"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("funnels.searchContact is a function", () => {
    type Fn = WasapiClient["funnels"]["searchContact"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("funnels.moveContactToFunnel is a function", () => {
    type Fn = WasapiClient["funnels"]["moveContactToFunnel"];
    expectTypeOf<Fn>().toBeFunction();
  });
});

describe("SDK shape contracts — metrics", () => {
  it("metrics.getOnlineAgents is a function", () => {
    type Fn = WasapiClient["metrics"]["getOnlineAgents"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getStatusContacts is a function", () => {
    type Fn = WasapiClient["metrics"]["getStatusContacts"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getTotalCampaigns is a function", () => {
    type Fn = WasapiClient["metrics"]["getTotalCampaigns"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getConsolidatedConversations is a function", () => {
    type Fn = WasapiClient["metrics"]["getConsolidatedConversations"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getAgentConversations is a function", () => {
    type Fn = WasapiClient["metrics"]["getAgentConversations"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getMessages is a function", () => {
    type Fn = WasapiClient["metrics"]["getMessages"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getMessagesBot is a function", () => {
    type Fn = WasapiClient["metrics"]["getMessagesBot"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getAgentTimeResponse is a function", () => {
    type Fn = WasapiClient["metrics"]["getAgentTimeResponse"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getAgentTransferred is a function", () => {
    type Fn = WasapiClient["metrics"]["getAgentTransferred"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getAgentVolumeOfWork is a function", () => {
    type Fn = WasapiClient["metrics"]["getAgentVolumeOfWork"];
    expectTypeOf<Fn>().toBeFunction();
  });

  it("metrics.getAgentTimeInConversation is a function", () => {
    type Fn = WasapiClient["metrics"]["getAgentTimeInConversation"];
    expectTypeOf<Fn>().toBeFunction();
  });
});
