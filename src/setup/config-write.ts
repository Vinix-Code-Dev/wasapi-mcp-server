import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";

export interface WasapiEntry {
  command: string;
  args: string[];
  env: { WASAPI_API_KEY: string; WASAPI_FROM_ID?: string };
}

export interface ConfigShape {
  mcpServers?: Record<string, unknown>;
  [k: string]: unknown;
}

export function readConfig(path: string): ConfigShape {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Config root must be an object");
    }
    return parsed as ConfigShape;
  } catch (e) {
    throw new Error(`Failed to parse ${path}: ${(e as Error).message}`);
  }
}

function timestampForBackup(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

export interface WriteOpts {
  path: string;
  entry: WasapiEntry;
  overwrite: boolean;
  now?: Date;
}

export interface WriteResult {
  existedBefore: boolean;
  backupPath: string | null;
}

export function writeWasapiEntry({ path, entry, overwrite, now }: WriteOpts): WriteResult {
  const fileExisted = existsSync(path);
  const config = readConfig(path);
  config.mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
  const existedBefore = "wasapi" in config.mcpServers;

  if (existedBefore && !overwrite) {
    return { existedBefore, backupPath: null };
  }

  let backupPath: string | null = null;
  if (fileExisted) {
    backupPath = `${path}.bak-${timestampForBackup(now ?? new Date())}`;
    copyFileSync(path, backupPath);
  }
  config.mcpServers.wasapi = entry;
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf8");
  return { existedBefore, backupPath };
}
