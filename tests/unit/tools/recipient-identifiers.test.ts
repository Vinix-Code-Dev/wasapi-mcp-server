// tests/unit/tools/recipient-identifiers.test.ts
//
// Congela el contrato de identificadores hacia el modelo (WSP-529).
//
// Estos tools no traducen nada: pasan `wa_id` tal cual al SDK, y el SDK lo pasa tal cual a la
// API, que ya resuelve teléfono, BSUID, uuid y username. Por eso el único punto donde el
// soporte puede romperse es **la descripción**: si dice "E.164 sin +", un agente no va a
// intentar mandar un BSUID, y un contacto de número oculto queda inalcanzable aunque el
// backend lo soporte. Era exactamente el estado anterior de las 11 familias.
//
// El test recorre los tools reales en vez de una lista escrita a mano, así que un tool nuevo
// con slot `wa_id` y descripción incompleta lo pone rojo sin que nadie tenga que acordarse.
import { describe, it, expect } from "vitest";
import { zodToJsonSchema } from "zod-to-json-schema";
import { allTools } from "../../../src/tools/index.js";

type Props = Record<string, { description?: string }>;

function propiedades(schema: unknown): Props {
  const json = zodToJsonSchema(schema as never) as { properties?: Props };
  return json.properties ?? {};
}

/** Tools cuyo slot `wa_id` identifica a un contacto destinatario. */
const conWaId = allTools.filter((t) => "wa_id" in propiedades(t.schema));

describe("identificadores de contacto en los tools", () => {
  it("hay tools con slot wa_id (si no, este test se volvió inútil sin avisar)", () => {
    expect(conWaId.length).toBeGreaterThan(5);
  });

  it.each(conWaId.map((t) => [t.name, t] as const))(
    "%s documenta BSUID y username en wa_id",
    (_nombre, tool) => {
      const desc = propiedades(tool.schema).wa_id?.description ?? "";

      expect(desc).not.toBe("");
      expect(desc.toLowerCase()).toContain("bsuid");
      expect(desc.toLowerCase()).toContain("username");
    },
  );

  it.each(conWaId.map((t) => [t.name, t] as const))(
    "%s no describe wa_id como si solo aceptara un teléfono",
    (_nombre, tool) => {
      const desc = propiedades(tool.schema).wa_id?.description ?? "";

      // "E.164" puede aparecer —es una de las tres formas válidas— pero no como la única.
      const soloTelefono = /^[^]*E\.164[^]*$/.test(desc) && !/bsuid/i.test(desc);
      expect(soloTelefono).toBe(false);
    },
  );

  it("send_template no exige contact_type", () => {
    const tool = allTools.find((t) => t.name === "send_template");
    expect(tool).toBeDefined();

    const json = zodToJsonSchema(tool!.schema as never) as { required?: string[] };
    expect(json.required ?? []).not.toContain("contact_type");
    expect(json.required ?? []).toContain("recipients");
  });

  it("create_contact acepta bsuid como alternativa a phone", () => {
    const tool = allTools.find((t) => t.name === "create_contact");
    expect(tool).toBeDefined();

    const props = propiedades(tool!.schema);
    expect(props.bsuid).toBeDefined();
    expect(props.bsuid?.description?.toLowerCase()).toContain("phone");

    // Ninguno de los dos es obligatorio por schema: la API decide, y exigir uno acá
    // impediría el alta por el otro.
    const json = zodToJsonSchema(tool!.schema as never) as { required?: string[] };
    expect(json.required ?? []).not.toContain("phone");
    expect(json.required ?? []).not.toContain("bsuid");
  });
});
