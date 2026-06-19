import { loadServeConfig } from "../config.js";
import { RedisStore } from "../oauth/redis-store.js";
import { buildHttpApp } from "./app.js";

/**
 * Entry point for `wasapi-mcp serve`. Loads serve-mode config, connects Redis,
 * builds the Express app and listens. Imported dynamically from index.ts so
 * Express/Redis are never loaded in stdio mode.
 */
export async function serve(port?: number): Promise<void> {
  const config = loadServeConfig();
  const effectivePort = port ?? config.port;
  const store = RedisStore.fromUrl(config.redisUrl);

  const app = buildHttpApp({ config, store });

  const server = app.listen(effectivePort, () => {
    process.stderr.write(
      `[wasapi-mcp] serve listening on :${effectivePort} (issuer ${config.issuerUrl})\n`,
    );
  });

  const shutdown = (signal: string) => {
    process.stderr.write(`[wasapi-mcp] ${signal} received, shutting down\n`);
    server.close(() => {
      void store.close().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
