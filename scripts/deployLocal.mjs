import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// NOTE: this local deploy is prejudiced for my local file paths; the idea is that iterating local development
// is easier than iterating a GitHub release, so this script is just a convenience for me. If you want to use it,
// you may need to change the default target path below, or pass a different path as an argument or via the
// FOUNDRY_MODULE_DIR environment variable.

// Same runtime footprint as prepareRelease.mjs's RELEASE_CONTENTS, minus the parts that only
// matter for a zipped GitHub release (no version stamping, no LICENSE — Foundry doesn't need it).
const DEPLOY_CONTENTS = [
  "module.json",
  "dist",
  "styles",
  "lang",
  "packs",
  "lexicons",
  "templates",
  "data-manifest.json",
];

const DEFAULT_TARGET = "C:\\u\\FoundryVTT\\Data\\modules\\onomasticon";
const target = process.env.FOUNDRY_MODULE_DIR || process.argv[2] || DEFAULT_TARGET;

if (!existsSync(target)) {
  console.error(
    `deployLocal: target directory "${target}" doesn't exist — create it first, or pass a different path (arg or FOUNDRY_MODULE_DIR env var).`,
  );
  process.exit(1);
}

for (const entry of DEPLOY_CONTENTS) {
  const source = join(ROOT, entry);
  if (!existsSync(source)) {
    console.error(`deployLocal: expected "${entry}" to exist (did you run "npm run build" first?)`);
    process.exit(1);
  }
}

for (const entry of DEPLOY_CONTENTS) {
  const source = join(ROOT, entry);
  const dest = join(target, entry);
  rmSync(dest, { recursive: true, force: true });
  cpSync(source, dest, { recursive: true });
}

console.log(`deployLocal: copied ${DEPLOY_CONTENTS.join(", ")} to ${target}`);
