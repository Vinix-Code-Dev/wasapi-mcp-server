import type { Request, Response, RequestHandler } from "express";
import type { OAuthStore } from "../oauth/redis-store.js";

/** Liveness: the process is up. Always 200 (no dependencies checked). */
export function handleHealthz(): RequestHandler {
  return (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  };
}

/** Readiness: fail-closed on Redis. 503 when Redis is unreachable. */
export function handleReadyz(store: OAuthStore): RequestHandler {
  return async (_req: Request, res: Response) => {
    const ok = await store.ping();
    res.status(ok ? 200 : 503).json({ status: ok ? "ready" : "unavailable", redis: ok });
  };
}
