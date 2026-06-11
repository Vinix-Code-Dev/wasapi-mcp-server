import { fileURLToPath } from "node:url";
import { openInBrowser } from "./browser.js";
import { validateKey, type ValidateResult, type WhatsappNumber } from "./validate-key.js";
import { writeWasapiEntry, type WasapiEntry } from "./config-write.js";
import { question, maskedQuestion, numberInRange } from "./prompt.js";
import { ALL_TARGETS, type Target } from "./targets.js";

const DASHBOARD_URL = process.env.WASAPI_DASHBOARD_URL ?? "https://app.wasapi.io/account/developer";

export interface SetupDeps {
  openInBrowser: typeof openInBrowser;
  validateKey: typeof validateKey;
  writeWasapiEntry: typeof writeWasapiEntry;
  question: typeof question;
  maskedQuestion: typeof maskedQuestion;
  numberInRange: typeof numberInRange;
  stdout: NodeJS.WritableStream;
  targets: Target[];
}

export interface RunSetupOpts {
  printOnly: boolean;
  local?: boolean;
  targetId?: string;
  deps?: SetupDeps;
}

const defaultDeps: SetupDeps = {
  openInBrowser,
  validateKey,
  writeWasapiEntry,
  question,
  maskedQuestion,
  numberInRange,
  stdout: process.stdout,
  targets: ALL_TARGETS,
};

function formatNumber(n: WhatsappNumber, idx: number): string {
  const phone = n.phone_number ?? "(sin teléfono)";
  const name = n.display_name ? ` — ${n.display_name}` : "";
  return `  ${idx + 1}) ${phone}${name}   (id: ${n.id})`;
}

function buildEntry(apiKey: string, fromId: number | null, local: boolean): WasapiEntry {
  const env: WasapiEntry["env"] = { WASAPI_API_KEY: apiKey };
  if (fromId !== null) env.WASAPI_FROM_ID = String(fromId);
  if (local) {
    const localPath = fileURLToPath(new URL("./../index.js", import.meta.url));
    return { command: "node", args: [localPath], env };
  }
  return { command: "npx", args: ["-y", "@jpabloe/wasapi-mcp-server"], env };
}

function printManualBlock(out: NodeJS.WritableStream, entry: WasapiEntry): void {
  out.write("      Pega esto en la config de tu plataforma MCP:\n\n");
  out.write(JSON.stringify({ mcpServers: { wasapi: entry } }, null, 2) + "\n\n");
  out.write("      Paths comunes:\n");
  out.write("        Claude Desktop:  ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)\n");
  out.write("        Cursor:          ~/.cursor/mcp.json\n");
  out.write("        Otros:           consulta la doc de tu plataforma\n\n");
}

export async function runSetup(opts: RunSetupOpts): Promise<void> {
  const d = opts.deps ?? defaultDeps;
  const out = d.stdout;

  if (!(process.stdin as NodeJS.ReadStream).isTTY && !opts.deps) {
    process.stderr.write("setup requiere terminal interactiva. No funciona con pipes o CI.\n");
    process.exit(1);
  }

  out.write("\n");
  out.write("╭─────────────────────────────────────────────────────────────╮\n");
  out.write("│  Wasapi MCP — setup wizard                                  │\n");
  out.write("│                                                             │\n");
  out.write("│  Te voy a guiar para conectar tu cuenta de Wasapi con tu    │\n");
  out.write("│  plataforma MCP (Claude Desktop, Cursor, etc).              │\n");
  out.write("╰─────────────────────────────────────────────────────────────╯\n\n");

  out.write("[1/4] Necesitas una API key de Wasapi para que el MCP pueda\n");
  out.write("      gestionar tus contactos y mensajes de WhatsApp.\n\n");
  out.write(`      Voy a abrir tu navegador en:\n        ${DASHBOARD_URL}\n\n`);
  out.write("      Allí: inicia sesión, genera o copia tu API key, y\n");
  out.write("      vuelve a esta terminal para pegarla.\n\n");

  await d.question("      Presiona ENTER para abrir el navegador...");
  const opened = await d.openInBrowser(DASHBOARD_URL);
  if (!opened) {
    out.write(`      ✗ No pude abrir el navegador automáticamente.\n`);
    out.write(`        Copia y pega esta URL: ${DASHBOARD_URL}\n\n`);
  } else {
    out.write("      ✓ Navegador abierto.\n\n");
  }

  let apiKey = "";
  let numbers: WhatsappNumber[] = [];
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const raw = await d.maskedQuestion("[2/4] Pega tu API key aquí: ");
    if (raw.length === 0) {
      out.write("      ✗ La key no puede estar vacía.\n");
      attempt--;
      continue;
    }
    out.write("      Validando contra Wasapi...\n");
    const result: ValidateResult = await d.validateKey(raw);
    if (result.ok) {
      apiKey = raw;
      numbers = result.numbers;
      out.write("      ✓ Key válida.\n\n");
      break;
    }
    out.write(`      ✗ ${result.message}\n`);
    if (result.category === "network" || result.category === "rate_limit" || result.category === "server") {
      out.write(`\nNo se puede continuar (${result.category}). Intenta más tarde.\n`);
      process.exit(1);
    }
    if (attempt === MAX_ATTEMPTS) {
      out.write(`\nDespués de ${MAX_ATTEMPTS} intentos fallidos. Verifica tu key en ${DASHBOARD_URL}\n`);
      process.exit(1);
    }
  }

  let fromId: number | null = null;
  if (numbers.length === 0) {
    out.write("[3/4] No tienes números conectados aún; podrás setear from_id después por env var o por parámetro.\n\n");
  } else if (numbers.length === 1) {
    fromId = Number(numbers[0].id);
    out.write(`[3/4] Default from_id = ${fromId} (único número en tu cuenta).\n\n`);
  } else {
    out.write(`[3/4] Encontré ${numbers.length} números de WhatsApp en tu cuenta:\n`);
    numbers.forEach((n, i) => out.write(formatNumber(n, i) + "\n"));
    const pick = await d.numberInRange(
      `      ¿Cuál usar como default? [1-${numbers.length}, o ENTER para no setear default]: `,
      1,
      numbers.length,
      { allowEmpty: true },
    );
    if (pick !== null) {
      fromId = Number(numbers[pick - 1].id);
      out.write(`      ✓ Default from_id = ${fromId}\n\n`);
    } else {
      out.write("      ✓ Sin default; especifícalo por tool call.\n\n");
    }
  }

  const entry = buildEntry(apiKey, fromId, opts.local ?? false);

  if (opts.printOnly) {
    out.write("[4/4] --print-only: aquí está la entrada para pegar manualmente:\n\n");
    out.write(JSON.stringify({ mcpServers: { wasapi: entry } }, null, 2) + "\n\n");
    return;
  }

  let target: Target | undefined;
  if (opts.targetId) {
    target = d.targets.find((t) => t.id === opts.targetId);
    if (!target) {
      out.write(`[4/4] Target desconocido: '${opts.targetId}'. Opciones: ${d.targets.map((t) => t.id).join(", ")}.\n\n`);
      printManualBlock(out, entry);
      return;
    }
  } else {
    out.write("[4/4] ¿Dónde quieres instalar el MCP?\n");
    d.targets.forEach((t, i) => out.write(`        ${i + 1}) ${t.label}\n`));
    out.write(`        ${d.targets.length + 1}) Otra plataforma (imprimir JSON para pegar manualmente)\n`);
    const pick = await d.numberInRange(
      `      Selecciona [1-${d.targets.length + 1}]: `,
      1,
      d.targets.length + 1,
    );
    if (pick === null || pick === d.targets.length + 1) {
      out.write("\n");
      printManualBlock(out, entry);
      return;
    }
    target = d.targets[pick - 1];
    out.write("\n");
  }

  let cfgPath: string;
  try {
    cfgPath = target.configPath({ platform: process.platform, env: process.env });
  } catch (e) {
    out.write(`      ✗ No pude detectar el path de ${target.label}: ${(e as Error).message}\n\n`);
    printManualBlock(out, entry);
    return;
  }

  out.write(`      Detecté ${target.label} config en:\n        ${cfgPath}\n`);
  const confirm = await d.question(`      ¿Configurar automáticamente? [Y/n]: `);
  const accepted = confirm === "" || /^y(es)?$/i.test(confirm);
  if (!accepted) {
    out.write("\n");
    printManualBlock(out, entry);
    return;
  }

  try {
    const result = d.writeWasapiEntry({ path: cfgPath, entry, overwrite: true });
    if (result.backupPath) {
      out.write(`      ✓ Backup guardado: ${result.backupPath}\n`);
    }
    out.write('      ✓ Entrada "wasapi" agregada.\n\n');
    out.write(`Listo. ${target.restartHint}.\n`);
  } catch (e) {
    out.write(`      ✗ No pude escribir el config: ${(e as Error).message}\n`);
    out.write("      Sugerencia: corre 'wasapi-mcp setup --print-only' y pega el JSON manualmente.\n");
    process.exit(1);
  }
}
