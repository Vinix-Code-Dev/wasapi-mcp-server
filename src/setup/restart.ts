import { spawn } from "node:child_process";

export interface RestartResult {
  ok: boolean;
  message: string;
}

function run(command: string, args: string[]): Promise<{ code: number | null; err?: Error }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", (err) => resolve({ code: null, err }));
    child.once("exit", (code) => resolve({ code }));
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function restartApp(
  appName: string,
  platform: NodeJS.Platform = process.platform,
): Promise<RestartResult> {
  if (platform !== "darwin") {
    return { ok: false, message: `Auto-restart sólo está implementado en macOS (platform=${platform}).` };
  }
  const quit = await run("osascript", ["-e", `quit app "${appName}"`]);
  if (quit.err) return { ok: false, message: `No pude cerrar ${appName}: ${quit.err.message}` };
  await sleep(800);
  const open = await run("open", ["-a", appName]);
  if (open.err) return { ok: false, message: `Cerré ${appName} pero no lo pude reabrir: ${open.err.message}` };
  if (open.code !== 0) {
    return { ok: false, message: `Cerré ${appName} pero 'open -a' falló (exit ${open.code}). Reábrelo a mano.` };
  }
  return { ok: true, message: `${appName} reiniciado.` };
}
