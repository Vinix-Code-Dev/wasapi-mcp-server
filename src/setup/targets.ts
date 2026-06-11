import { posix, win32 } from "node:path";

export interface TargetPathOpts {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
}

export interface Target {
  id: string;
  label: string;
  configPath(opts: TargetPathOpts): string;
  restartHint: string;
  envOverride: string;
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`${key} env var is not set; cannot locate config.`);
  return v;
}

export const CLAUDE_DESKTOP: Target = {
  id: "claude-desktop",
  label: "Claude Desktop",
  envOverride: "CLAUDE_DESKTOP_CONFIG",
  restartHint: "Reinicia Claude Desktop (Cmd+Q completo + volver a abrir)",
  configPath: ({ platform, env }) => {
    if (env.CLAUDE_DESKTOP_CONFIG) return env.CLAUDE_DESKTOP_CONFIG;
    if (platform === "darwin")
      return posix.join(requireEnv(env, "HOME"), "Library", "Application Support", "Claude", "claude_desktop_config.json");
    if (platform === "win32") return win32.join(requireEnv(env, "APPDATA"), "Claude", "claude_desktop_config.json");
    if (platform === "linux") return posix.join(requireEnv(env, "HOME"), ".config", "Claude", "claude_desktop_config.json");
    throw new Error(`Unsupported platform: ${platform}`);
  },
};

export const CURSOR: Target = {
  id: "cursor",
  label: "Cursor",
  envOverride: "CURSOR_MCP_CONFIG",
  restartHint: "Reinicia Cursor o recarga la ventana (Cmd+Shift+P → 'Developer: Reload Window')",
  configPath: ({ platform, env }) => {
    if (env.CURSOR_MCP_CONFIG) return env.CURSOR_MCP_CONFIG;
    if (platform === "win32") return win32.join(requireEnv(env, "USERPROFILE"), ".cursor", "mcp.json");
    return posix.join(requireEnv(env, "HOME"), ".cursor", "mcp.json");
  },
};

export const ALL_TARGETS: Target[] = [CLAUDE_DESKTOP, CURSOR];

export function findTargetById(id: string): Target | undefined {
  return ALL_TARGETS.find((t) => t.id === id);
}
