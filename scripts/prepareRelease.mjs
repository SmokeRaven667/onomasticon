import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const STAGING_DIR = join(ROOT, "release-staging");
const REPO = "SmokeRaven667/onomasticon";

/**
 * Everything that has to exist under Data/modules/onomasticon/ for the module to run —
 * module.json's own esmodules/styles/languages entries, plus the runtime-fetched content
 * (packs/lexicons/templates, data-manifest.json) loadBundledRegistry/GeneratorApp/
 * PackAuthorApp pull in via relative `modules/onomasticon/...` URLs at runtime. `dist/` and
 * `data-manifest.json` are gitignored build output — this script must run after `npm run
 * build`, not instead of it.
 */
const RELEASE_CONTENTS = [
  "module.json",
  "dist",
  "styles",
  "lang",
  "packs",
  "lexicons",
  "templates",
  "data-manifest.json",
  "LICENSE",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const version = process.env.RELEASE_VERSION;
if (!version) {
  console.error("prepareRelease: RELEASE_VERSION environment variable is required (e.g. 0.1.0)");
  process.exit(1);
}
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(
    `prepareRelease: RELEASE_VERSION "${version}" doesn't look like a semver (expected e.g. "0.1.0", no leading "v")`,
  );
  process.exit(1);
}

const packageJsonPath = join(ROOT, "package.json");
const packageJson = readJson(packageJsonPath);
if (packageJson.version !== version) {
  console.error(
    `prepareRelease: package.json's version ("${packageJson.version}") doesn't match the tag being released ("${version}") — bump package.json (and module.json) and commit that before tagging, so the tag and the committed version never drift apart.`,
  );
  process.exit(1);
}

const moduleJsonPath = join(ROOT, "module.json");
const moduleJson = readJson(moduleJsonPath);
if (moduleJson.version !== version) {
  console.error(
    `prepareRelease: module.json's version ("${moduleJson.version}") doesn't match the tag being released ("${version}").`,
  );
  process.exit(1);
}

// Stable across every release, so an installed module's own "check for updates" always finds
// whatever's newest; this-release-specific, so a manifest fetched for *this* version (e.g. by
// someone pinning an older release) still resolves to the matching zip, not a newer one.
moduleJson.manifest = `https://github.com/${REPO}/releases/latest/download/module.json`;
moduleJson.download = `https://github.com/${REPO}/releases/download/v${version}/module.zip`;
writeJson(moduleJsonPath, moduleJson);

if (existsSync(STAGING_DIR)) rmSync(STAGING_DIR, { recursive: true, force: true });
mkdirSync(STAGING_DIR, { recursive: true });

for (const entry of RELEASE_CONTENTS) {
  const source = join(ROOT, entry);
  if (!existsSync(source)) {
    console.error(
      `prepareRelease: expected "${entry}" to exist (did you run "npm run build" first?)`,
    );
    process.exit(1);
  }
  cpSync(source, join(STAGING_DIR, entry), { recursive: true });
}

console.log(`prepareRelease: staged v${version} into ${STAGING_DIR}`);
