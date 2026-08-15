import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadAllPacks, loadPackFile } from "./loadPack.js";

const PACKS_DIR = fileURLToPath(new URL("../../packs", import.meta.url));

describe("loadAllPacks (real repo packs)", () => {
  it("loads every bundled pack cleanly, with no batch-level errors", () => {
    const { entries, errors } = loadAllPacks(PACKS_DIR);

    expect(entries.length).toBeGreaterThanOrEqual(3);
    for (const entry of entries) {
      expect(entry.result.errors, `${entry.file}: ${JSON.stringify(entry.result.errors)}`).toEqual(
        [],
      );
      expect(entry.result.valid, entry.file).toBe(true);
    }
    expect(errors).toEqual([]);
  });
});

describe("loadPackFile", () => {
  it("reports invalid-json for a file that isn't parseable JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "onomasticon-test-"));
    const filePath = join(dir, "broken.json");
    writeFileSync(filePath, "{ not valid json", "utf-8");

    const result = loadPackFile(filePath);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe("invalid-json");
  });
});
