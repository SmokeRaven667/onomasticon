import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function listEntries(dirName) {
  const dir = join(ROOT, dirName);
  const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
  return files
    .map((file) => {
      const data = JSON.parse(readFileSync(join(dir, file), "utf-8"));
      return { id: data.id, file: `${dirName}/${file}` };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

const manifest = {
  packs: listEntries("packs"),
  lexicons: listEntries("lexicons"),
};

writeFileSync(join(ROOT, "data-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `data-manifest.json: ${manifest.packs.length} pack(s), ${manifest.lexicons.length} lexicon(s)`,
);
