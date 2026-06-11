import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSetup, type SetupDeps } from "../../src/setup/index.js";
import type { Target } from "../../src/setup/targets.js";

const mockClaudeDesktop: Target = {
  id: "claude-desktop",
  label: "Claude Desktop",
  envOverride: "CLAUDE_DESKTOP_CONFIG",
  restartHint: "Reinicia Claude Desktop",
  configPath: () => "/tmp/claude_desktop_config.json",
};

const mockCursor: Target = {
  id: "cursor",
  label: "Cursor",
  envOverride: "CURSOR_MCP_CONFIG",
  restartHint: "Reinicia Cursor",
  configPath: () => "/tmp/cursor-mcp.json",
};

function makeDeps(): SetupDeps {
  return {
    openInBrowser: vi.fn().mockResolvedValue(true),
    validateKey: vi.fn().mockResolvedValue({ ok: true, numbers: [{ id: 12345, phone_number: "+57300" }] }),
    writeWasapiEntry: vi.fn().mockReturnValue({ existedBefore: false, backupPath: null }),
    question: vi.fn(),
    maskedQuestion: vi.fn(),
    numberInRange: vi.fn(),
    stdout: { write: vi.fn() } as unknown as NodeJS.WritableStream,
    targets: [mockClaudeDesktop, mockCursor],
  };
}

let deps: SetupDeps;

beforeEach(() => {
  deps = makeDeps();
});

const stdoutText = (d: SetupDeps): string =>
  (d.stdout.write as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]).join("");

describe("runSetup happy path", () => {
  it("with 1 number, auto-selects from_id and writes to chosen target", async () => {
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.numberInRange as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1); // pick Claude Desktop
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, deps });

    expect(deps.validateKey).toHaveBeenCalledWith("key_abc");
    expect(deps.writeWasapiEntry).toHaveBeenCalled();
    const call = (deps.writeWasapiEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.entry.env.WASAPI_API_KEY).toBe("key_abc");
    expect(call.entry.env.WASAPI_FROM_ID).toBe("12345");
    expect(call.path).toBe("/tmp/claude_desktop_config.json");
  });

  it("targetId='cursor' skips menu and writes cursor config", async () => {
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, targetId: "cursor", deps });

    expect(deps.numberInRange).not.toHaveBeenCalled(); // no menu
    const call = (deps.writeWasapiEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.path).toBe("/tmp/cursor-mcp.json");
  });

  it("with 0 numbers, skips from_id and still writes", async () => {
    (deps.validateKey as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, numbers: [] });
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.numberInRange as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, deps });

    const call = (deps.writeWasapiEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.entry.env.WASAPI_FROM_ID).toBeUndefined();
  });

  it("with multiple WhatsApp numbers, asks user to pick", async () => {
    (deps.validateKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      numbers: [{ id: 11, phone_number: "+1" }, { id: 22, phone_number: "+2" }],
    });
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.numberInRange as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(2) // pick whatsapp number 2
      .mockResolvedValueOnce(1); // pick Claude Desktop
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, deps });

    const call = (deps.writeWasapiEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.entry.env.WASAPI_FROM_ID).toBe("22");
  });

  it("'Other platform' menu choice prints JSON without writing", async () => {
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.numberInRange as ReturnType<typeof vi.fn>).mockResolvedValueOnce(3); // "Otra plataforma"

    await runSetup({ printOnly: false, deps });

    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    expect(stdoutText(deps)).toContain('"WASAPI_API_KEY": "key_abc"');
  });

  it("printOnly does not write to disk", async () => {
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");

    await runSetup({ printOnly: true, deps });

    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    expect(stdoutText(deps)).toContain('"WASAPI_API_KEY": "key_abc"');
  });
});

describe("runSetup edge cases", () => {
  it("retries after invalid key (max 3) then exits", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
      throw new Error("__exit__");
    }) as never);
    (deps.maskedQuestion as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce("bad1")
      .mockResolvedValueOnce("bad2")
      .mockResolvedValueOnce("bad3");
    (deps.validateKey as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, category: "auth", message: "API key inválida" })
      .mockResolvedValueOnce({ ok: false, category: "auth", message: "API key inválida" })
      .mockResolvedValueOnce({ ok: false, category: "auth", message: "API key inválida" });
    await expect(runSetup({ printOnly: false, deps })).rejects.toThrow("__exit__");
    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    exit.mockRestore();
  });

  it("declines auto-config: prints JSON, does not write", async () => {
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.numberInRange as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("n");
    await runSetup({ printOnly: false, deps });
    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    expect(stdoutText(deps)).toContain('"WASAPI_API_KEY": "key_abc"');
  });

  it("network error during validation exits without saving", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
      throw new Error("__exit__");
    }) as never);
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValue("k");
    (deps.validateKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      category: "network",
      message: "No pude contactar a Wasapi",
    });
    await expect(runSetup({ printOnly: false, deps })).rejects.toThrow("__exit__");
    expect(deps.writeWasapiEntry).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});
