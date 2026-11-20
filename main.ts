// Palm City Cover Studio — entry program.
//
// Copies the app and its screenshots into the output directory
// and writes the dossier that buildDossier produces from them.
// Run by the grader twice; both runs must write the same bytes,
// so this program does nothing but copy files and call the
// kit's dossier builder. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));
// Resolve the output directory so a relative MAKEFUN_OUTPUT_DIR
// works no matter which directory the program runs from.
const OUT = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

// The gate's caps, as the competition rules state them: the
// dossier text holds at most 160 KiB, the dossier file at most
// 1.5 MiB, and an entry carries at most 4 screenshots.
const CAPS = {
  text_max_bytes: 163840,
  dossier_max_bytes: 1572864,
  max_images: 4,
};

function copyTree(source: string, dest: string): void {
  cpSync(source, dest, { recursive: true });
}

function main(): void {
  rmSync(join(OUT, "app"), { recursive: true, force: true });
  rmSync(join(OUT, "screenshots"), { recursive: true, force: true });
  rmSync(join(OUT, "dossier.json"), { force: true });
  mkdirSync(OUT, { recursive: true });
  copyTree(join(ROOT, "app"), join(OUT, "app"));
  copyTree(join(ROOT, "screenshots"), join(OUT, "screenshots"));
  // buildDossier takes the repository root and returns the
  // dossier as bytes; write them out unchanged.
  const dossier = buildDossier(ROOT, CAPS);
  if (dossier.length > CAPS.dossier_max_bytes) {
    throw new Error(
      `dossier is ${dossier.length} bytes, over the ${CAPS.dossier_max_bytes} byte cap`,
    );
  }
  writeFileSync(join(OUT, "dossier.json"), dossier);
}

main();
