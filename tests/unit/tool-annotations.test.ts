// tests/unit/tool-annotations.test.ts
import { describe, it, expect } from "vitest";
import { getAnnotations, TOOL_ANNOTATIONS } from "../../src/lib/tool-annotations.js";
import { allTools } from "../../src/tools/index.js";

describe("tool annotations", () => {
  it("every registered tool has an annotation entry", () => {
    const missing = allTools.map((t) => t.name).filter((n) => !(n in TOOL_ANNOTATIONS));
    expect(missing).toEqual([]);
  });

  it("read-only tools resolve to readOnlyHint:true", () => {
    const a = getAnnotations("list_contacts");
    expect(a.title).toBeTruthy();
    expect(a.readOnlyHint).toBe(true);
    expect(a.destructiveHint).toBeUndefined();
  });

  it("write tools resolve to destructiveHint:true", () => {
    const a = getAnnotations("delete_contact");
    expect(a.title).toBeTruthy();
    expect(a.readOnlyHint).toBe(false);
    expect(a.destructiveHint).toBe(true);
  });

  it("unknown tool name falls back to destructive (conservative)", () => {
    const a = getAnnotations("__not_a_tool__");
    expect(a.readOnlyHint).toBe(false);
    expect(a.destructiveHint).toBe(true);
  });

  it("count matches: 40 read-only, 22 write", () => {
    const entries = Object.values(TOOL_ANNOTATIONS);
    expect(entries.filter((e) => e.readOnly).length).toBe(40);
    expect(entries.filter((e) => !e.readOnly).length).toBe(22);
  });
});
