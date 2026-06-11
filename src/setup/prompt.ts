import * as readline from "node:readline";

export interface PromptStreams {
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
}

const stripQuotes = (s: string): string => s.replace(/^['"]+|['"]+$/g, "");

export async function question(label: string, streams: PromptStreams = {}): Promise<string> {
  const rl = readline.createInterface({
    input: streams.stdin ?? process.stdin,
    output: streams.stdout ?? process.stdout,
  });
  try {
    const answer = await new Promise<string>((resolve) => rl.question(label, resolve));
    return stripQuotes(answer.trim());
  } finally {
    rl.close();
  }
}

export interface NumberInRangeOpts extends PromptStreams {
  allowEmpty?: boolean;
}

export async function numberInRange(
  label: string,
  min: number,
  max: number,
  opts: NumberInRangeOpts = {},
): Promise<number | null> {
  const input = opts.stdin ?? process.stdin;
  const out = opts.stdout ?? process.stdout;
  const rl = readline.createInterface({ input, output: out });
  return new Promise<number | null>((resolve, reject) => {
    const onLine = (line: string) => {
      const raw = stripQuotes(line.trim());
      if (raw === "" && opts.allowEmpty) {
        finish(null);
        return;
      }
      const n = Number(raw);
      if (Number.isInteger(n) && n >= min && n <= max) {
        finish(n);
        return;
      }
      out.write(`  ✗ Ingresa un número entre ${min} y ${max}.\n`);
      out.write(label);
    };
    const finish = (value: number | null) => {
      rl.off("line", onLine);
      rl.close();
      resolve(value);
    };
    rl.on("line", onLine);
    rl.once("error", (e) => {
      rl.close();
      reject(e);
    });
    out.write(label);
  });
}

export async function maskedQuestion(label: string, streams: PromptStreams = {}): Promise<string> {
  const input = (streams.stdin ?? process.stdin) as NodeJS.ReadStream;
  const output = streams.stdout ?? process.stdout;

  output.write(label);

  if (!input.isTTY) {
    const rl = readline.createInterface({ input, output });
    try {
      const answer = await new Promise<string>((resolve) => rl.once("line", resolve));
      return stripQuotes(answer.trim());
    } finally {
      rl.close();
    }
  }

  const wasRaw = input.isRaw;
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");

  return await new Promise<string>((resolve, reject) => {
    let buf = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          cleanup();
          output.write("\n");
          resolve(stripQuotes(buf.trim()));
          return;
        }
        if (ch === "") {
          cleanup();
          output.write("\n");
          process.exit(0);
        }
        if (ch === "" || ch === "\b") {
          if (buf.length > 0) {
            buf = buf.slice(0, -1);
            output.write("\b \b");
          }
          continue;
        }
        buf += ch;
        output.write("*");
      }
    };
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(wasRaw);
      input.pause();
    };
    input.on("data", onData);
    input.once("error", (err) => {
      cleanup();
      reject(err);
    });
  });
}
