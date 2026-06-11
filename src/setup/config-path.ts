import { posix, win32 } from "node:path";

export interface ResolveOpts {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
}

export function resolveConfigPath({ platform, env }: ResolveOpts): string {
  if (env.CLAUDE_DESKTOP_CONFIG) return env.CLAUDE_DESKTOP_CONFIG;
  if (platform === "darwin") {
    if (!env.HOME) throw new Error("HOME env var is not set; cannot locate Claude Desktop config.");
    return posix.join(env.HOME, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (platform === "win32") {
    if (!env.APPDATA) throw new Error("APPDATA env var is not set; cannot locate Claude Desktop config.");
    return win32.join(env.APPDATA, "Claude", "claude_desktop_config.json");
  }
  if (platform === "linux") {
    if (!env.HOME) throw new Error("HOME env var is not set; cannot locate Claude Desktop config.");
    return posix.join(env.HOME, ".config", "Claude", "claude_desktop_config.json");
  }
  throw new Error(`Unsupported platform: ${platform}`);
}
