import { spawn } from "node:child_process";

export interface OpenCommand {
  command: string;
  argsPrefix: string[];
}

export function resolveOpenCommand(platform: NodeJS.Platform): OpenCommand | null {
  if (platform === "darwin") return { command: "open", argsPrefix: [] };
  if (platform === "win32") return { command: "cmd", argsPrefix: ["/c", "start", ""] };
  if (platform === "linux") return { command: "xdg-open", argsPrefix: [] };
  return null;
}

export async function openInBrowser(url: string, platform: NodeJS.Platform = process.platform): Promise<boolean> {
  const cmd = resolveOpenCommand(platform);
  if (!cmd) return false;
  try {
    const child = spawn(cmd.command, [...cmd.argsPrefix, url], { stdio: "ignore", detached: true });
    child.unref();
    return await new Promise<boolean>((resolve) => {
      child.once("error", () => resolve(false));
      setTimeout(() => resolve(true), 100);
    });
  } catch {
    return false;
  }
}
