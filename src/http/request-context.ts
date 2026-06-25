import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext } from "../oauth/types.js";

/**
 * Per-request store for serve mode. Each /mcp request runs inside
 * runWithContext() carrying the authenticated user's Wasapi key + identity,
 * so getClient() and resolveFromId() can read it without any global state.
 * This is what keeps two concurrent users' tool calls isolated.
 */
const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

/** Returns the current request context, or undefined when not in serve mode (stdio). */
export function getContext(): RequestContext | undefined {
  return als.getStore();
}
