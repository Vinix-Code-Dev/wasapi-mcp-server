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
