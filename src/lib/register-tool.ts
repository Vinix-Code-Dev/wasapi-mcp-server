import { z, ZodType } from "zod";
import { mapError } from "./errors.js";

export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function wrapHandler<S extends ZodType>(
  schema: S,
  handler: (args: z.infer<S>) => Promise<unknown>,
): (rawArgs: unknown) => Promise<ToolResponse> {
  return async (rawArgs) => {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      return { content: [{ type: "text", text: `Validation error: ${msg}` }], isError: true };
    }
    try {
      const result = await handler(parsed.data);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const m = mapError(err);
      if (process.env.WASAPI_DEBUG === "1") {
        process.stderr.write(`[wasapi-mcp] ${m.category}: ${m.message}\n`);
      }
      return { content: [{ type: "text", text: m.message }], isError: true };
    }
  };
}

export interface ToolDefinition<S extends ZodType = ZodType> {
  name: string;
  description: string;
  schema: S;
  handler: (args: z.infer<S>) => Promise<unknown>;
}
