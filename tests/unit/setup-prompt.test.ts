import { describe, it, expect } from "vitest";
import { PassThrough, Writable } from "node:stream";
import { question, numberInRange } from "../../src/setup/prompt.js";

function makeStdin(input: string): NodeJS.ReadableStream {
  const stream = new PassThrough();
  stream.write(input);
  return stream;
}

function makeStdout(): NodeJS.WritableStream {
  return new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  }) as unknown as NodeJS.WritableStream;
}

describe("question", () => {
  it("returns trimmed user input", async () => {
    const ans = await question("prompt> ", { stdin: makeStdin("  hello  \n"), stdout: makeStdout() });
    expect(ans).toBe("hello");
  });

  it("strips wrapping quotes", async () => {
    const ans = await question("> ", { stdin: makeStdin('"key_value"\n'), stdout: makeStdout() });
    expect(ans).toBe("key_value");
  });
});

describe("numberInRange", () => {
  it("returns the chosen index (1-based)", async () => {
    const ans = await numberInRange("pick> ", 1, 3, { stdin: makeStdin("2\n"), stdout: makeStdout() });
    expect(ans).toBe(2);
  });

  it("returns null on empty input when allowEmpty=true", async () => {
    const ans = await numberInRange("pick> ", 1, 3, { stdin: makeStdin("\n"), stdout: makeStdout(), allowEmpty: true });
    expect(ans).toBeNull();
  });

  it("re-prompts on out-of-range, then accepts valid", async () => {
    const ans = await numberInRange("pick> ", 1, 3, { stdin: makeStdin("9\n2\n"), stdout: makeStdout() });
    expect(ans).toBe(2);
  });
});
