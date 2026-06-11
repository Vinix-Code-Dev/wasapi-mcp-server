import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSetup, type SetupDeps } from "../../src/setup/index.js";

function makeDeps(): SetupDeps {
  return {
    openInBrowser: vi.fn().mockResolvedValue(true),
    resolveConfigPath: vi.fn().mockReturnValue("/tmp/claude_desktop_config.json"),
    validateKey: vi.fn().mockResolvedValue({ ok: true, numbers: [{ id: 12345, phone: "+57300" }] }),
    writeWasapiEntry: vi.fn().mockReturnValue({ existedBefore: false, backupPath: null }),
    question: vi.fn(),
    maskedQuestion: vi.fn(),
    numberInRange: vi.fn(),
    stdout: { write: vi.fn() } as unknown as NodeJS.WritableStream,
  } as unknown as SetupDeps;
}

let deps: SetupDeps;

beforeEach(() => {
  deps = makeDeps();
});

const stdoutText = (d: SetupDeps): string =>
  (d.stdout.write as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]).join("");

describe("runSetup happy path", () => {
  it("with 1 number, auto-selects from_id and writes config", async () => {
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, deps });

    expect(deps.validateKey).toHaveBeenCalledWith("key_abc");
    expect(deps.writeWasapiEntry).toHaveBeenCalled();
    const call = (deps.writeWasapiEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.entry.env.WASAPI_API_KEY).toBe("key_abc");
    expect(call.entry.env.WASAPI_FROM_ID).toBe("12345");
  });

  it("with 0 numbers, skips from_id and still writes", async () => {
    (deps.validateKey as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, numbers: [] });
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, deps });

    const call = (deps.writeWasapiEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.entry.env.WASAPI_FROM_ID).toBeUndefined();
  });

  it("with multiple numbers, asks user to pick", async () => {
    (deps.validateKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      numbers: [{ id: 11, phone: "+1" }, { id: 22, phone: "+2" }],
    });
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("");
    (deps.maskedQuestion as ReturnType<typeof vi.fn>).mockResolvedValueOnce("key_abc");
    (deps.numberInRange as ReturnType<typeof vi.fn>).mockResolvedValueOnce(2);
    (deps.question as ReturnType<typeof vi.fn>).mockResolvedValueOnce("y");

    await runSetup({ printOnly: false, deps });

    const call = (deps.writeWasapiEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.entry.env.WASAPI_FROM_ID).toBe("22");
  });

  it("printOnly does not write to disk", async () => {
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
