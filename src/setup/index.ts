import { openInBrowser } from "./browser.js";
import { resolveConfigPath } from "./config-path.js";
import { validateKey, type ValidateResult, type WhatsappNumber } from "./validate-key.js";
import { writeWasapiEntry, type WasapiEntry } from "./config-write.js";
import { question, maskedQuestion, numberInRange } from "./prompt.js";

const DASHBOARD_URL = process.env.WASAPI_DASHBOARD_URL ?? "https://app.wasapi.io/account/developer";

export interface SetupDeps {
  openInBrowser: typeof openInBrowser;
  resolveConfigPath: typeof resolveConfigPath;
  validateKey: typeof validateKey;
  writeWasapiEntry: typeof writeWasapiEntry;
  question: typeof question;
  maskedQuestion: typeof maskedQuestion;
  numberInRange: typeof numberInRange;
  stdout: NodeJS.WritableStream;
}

export interface RunSetupOpts {
  printOnly: boolean;
  deps?: SetupDeps;
}

const defaultDeps: SetupDeps = {
  openInBrowser,
  resolveConfigPath,
  validateKey,
  writeWasapiEntry,
  question,
  maskedQuestion,
  numberInRange,
  stdout: process.stdout,
};

function formatNumber(n: WhatsappNumber, idx: number): string {
  const phone = (n.phone as string | undefined) ?? "(sin teléfono)";
  return `  ${idx + 1}) ${phone}   (id: ${n.id})`;
}

function buildEntry(apiKey: string, fromId: number | null): WasapiEntry {
  const env: WasapiEntry["env"] = { WASAPI_API_KEY: apiKey };
  if (fromId !== null) env.WASAPI_FROM_ID = String(fromId);
  return { command: "npx", args: ["-y", "@wasapi/mcp-server"], env };
}

export async function runSetup(opts: RunSetupOpts): Promise<void> {
  const d = opts.deps ?? defaultDeps;
  const out = d.stdout;

  if (!(process.stdin as NodeJS.ReadStream).isTTY && !opts.deps) {
    process.stderr.write("setup requiere terminal interactiva. No funciona con pipes o CI.\n");
    process.exit(1);
  }

  out.write("\nWasapi MCP — setup wizard\n\n");

  out.write(`[1/4] Abriendo ${DASHBOARD_URL} en tu navegador...\n`);
  const opened = await d.openInBrowser(DASHBOARD_URL);
  if (!opened) {
    out.write(`      No pude abrir el navegador. Visítalo manualmente: ${DASHBOARD_URL}\n`);
  }
  out.write("      Inicia sesión si hace falta y copia tu API key.\n\n");

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

  const entry = buildEntry(apiKey, fromId);

  if (opts.printOnly) {
    out.write("[4/4] --print-only: aquí está la entrada para pegar en tu claude_desktop_config.json:\n\n");
    out.write(JSON.stringify({ mcpServers: { wasapi: entry } }, null, 2) + "\n\n");
    return;
  }

  let cfgPath: string;
  try {
    cfgPath = d.resolveConfigPath({ platform: process.platform, env: process.env });
  } catch (e) {
    out.write(`[4/4] No pude detectar el path del config: ${(e as Error).message}\n`);
    out.write("      Pega esto manualmente en tu claude_desktop_config.json:\n\n");
    out.write(JSON.stringify({ mcpServers: { wasapi: entry } }, null, 2) + "\n\n");
    return;
  }

  out.write(`[4/4] Detecté Claude Desktop config en:\n      ${cfgPath}\n`);
  const confirm = await d.question("      ¿Configurar automáticamente? [Y/n]: ");
  const accepted = confirm === "" || /^y(es)?$/i.test(confirm);
  if (!accepted) {
    out.write("\n      Pega esto manualmente en tu claude_desktop_config.json:\n\n");
    out.write(JSON.stringify({ mcpServers: { wasapi: entry } }, null, 2) + "\n\n");
    return;
  }

  try {
    const result = d.writeWasapiEntry({ path: cfgPath, entry, overwrite: true });
    if (result.backupPath) {
      out.write(`      ✓ Backup guardado: ${result.backupPath}\n`);
    }
    out.write('      ✓ Entrada "wasapi" agregada.\n\n');
    out.write("Listo. Reinicia Claude Desktop (Cmd+Q + abrir) para activar el server.\n");
  } catch (e) {
    out.write(`      ✗ No pude escribir el config: ${(e as Error).message}\n`);
    out.write("      Sugerencia: corre 'wasapi-mcp setup --print-only' y pega el JSON manualmente.\n");
    process.exit(1);
  }
}
