// scripts/build-dxt.mjs
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, createWriteStream } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { ZipArchive } = require("archiver");
import { buildManifest, manifestSchema } from "./generate-manifest.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(repoRoot, "release");
const stageDir = join(releaseDir, "wasapi-mcp");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: repoRoot, ...opts });
}

function log(msg) {
  process.stdout.write(`[build-dxt] ${msg}\n`);
}

function step1_clean() {
  log("Cleaning release/");
  rmSync(releaseDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });
}

function step2_build() {
  log("Building TypeScript");
  rmSync(join(repoRoot, "dist"), { recursive: true, force: true });
  run("npm run build");
  run("find dist -name .DS_Store -delete");
}

function step3_copyDist() {
  log("Copying dist/ to stage");
  cpSync(join(repoRoot, "dist"), join(stageDir, "dist"), { recursive: true });
}

function step4_installProdDeps() {
  log("Installing production dependencies (this takes a moment)");
  const pkgPath = join(repoRoot, "package.json");
  cpSync(pkgPath, join(stageDir, "package.json"));
  run("npm install --omit=dev --no-package-lock --silent", { cwd: stageDir });
  rmSync(join(stageDir, "package.json"));
}

function step5_copyAssets() {
  log("Copying icon and README");
  cpSync(join(repoRoot, "assets", "icon.png"), join(stageDir, "icon.png"));
  cpSync(join(repoRoot, "README.md"), join(stageDir, "README.md"));
}

function step6_writeManifest() {
  log("Generating manifest.json");
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const manifest = buildManifest(pkg);
  manifestSchema.parse(manifest); // throws if invalid
  writeFileSync(join(stageDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest.version;
}

function step7_zip(version) {
  const outPath = join(releaseDir, `wasapi-mcp-${version}.dxt`);
  log(`Creating ZIP: ${outPath}`);
  return new Promise((resolveZip, rejectZip) => {
    const output = createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", () => resolveZip(outPath));
    archive.on("error", rejectZip);
    archive.pipe(output);
    archive.directory(stageDir + "/", false);
    archive.finalize();
  });
}

async function main() {
  step1_clean();
  step2_build();
  step3_copyDist();
  step4_installProdDeps();
  step5_copyAssets();
  const version = step6_writeManifest();
  const outPath = await step7_zip(version);
  const size = statSync(outPath).size;
  log(`Done. ${outPath} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  process.stderr.write(`[build-dxt] FAILED: ${err?.message ?? err}\n`);
  process.exit(1);
});
