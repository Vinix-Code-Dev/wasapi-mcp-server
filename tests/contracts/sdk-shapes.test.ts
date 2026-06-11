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
});
