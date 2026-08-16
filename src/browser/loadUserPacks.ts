import type { Pack } from "../data/types.js";
import { validatePackData } from "../data/validatePack.js";

export interface FilePickerBrowseResult {
  files: string[];
}

export interface LoadUserPacksOptions {
  /** Directory (relative to Foundry's Data root) to scan for pack JSON files. */
  path: string;
  /** Injectable for testing; defaults to `foundry.applications.apps.FilePicker.browse`. */
  browseImpl?: (source: string, target: string) => Promise<FilePickerBrowseResult>;
  /** Injectable for testing; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

export interface LoadUserPacksResult {
  packs: Pack[];
  /**
   * Human-readable problems (unreadable directory, bad JSON, failed validation, a duplicate
   * id within this directory) — never thrown, only reported. User content is inherently
   * less trustworthy than the module's own bundled packs, so one broken or colliding file
   * is skipped-with-warning rather than allowed to break the whole registry.
   */
  warnings: string[];
}

async function loadUncached(options: LoadUserPacksOptions): Promise<LoadUserPacksResult> {
  const browse =
    options.browseImpl ??
    ((source: string, target: string) =>
      foundry.applications.apps.FilePicker.browse(source, target));
  const fetchImpl = options.fetchImpl ?? fetch;

  let files: string[];
  try {
    const browsed = await browse("data", options.path);
    files = browsed.files.filter((file) => file.toLowerCase().endsWith(".json")).sort();
  } catch (error) {
    return {
      packs: [],
      warnings: [
        `could not browse user pack directory "${options.path}": ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  const packs: Pack[] = [];
  const warnings: string[] = [];
  const seenBy = new Map<string, string>();

  for (const file of files) {
    let data: unknown;
    try {
      const response = await fetchImpl(file);
      if (!response.ok) {
        warnings.push(`"${file}" failed to fetch (${response.status})`);
        continue;
      }
      data = await response.json();
    } catch (error) {
      warnings.push(
        `"${file}" could not be read: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    const result = validatePackData(data);
    if (!result.pack) {
      warnings.push(
        `"${file}" is invalid: ${result.errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
      );
      continue;
    }

    const existingFile = seenBy.get(result.pack.id);
    if (existingFile) {
      warnings.push(
        `"${file}" uses id "${result.pack.id}", already used by "${existingFile}" in this directory — skipped`,
      );
      continue;
    }

    seenBy.set(result.pack.id, file);
    packs.push(result.pack);
  }

  return { packs, warnings };
}

const cache = new Map<string, Promise<LoadUserPacksResult>>();

/**
 * Scans a GM-configured directory (`module/settings.ts`'s own setting) for pack JSON
 * files via Foundry's `FilePicker`, and validates each one through the exact same step-03
 * validator bundled packs go through — no relaxed rules.
 *
 * Cached per `path` (unlike `loadBundledRegistry`'s single slot) so a GM changing the
 * configured directory naturally busts the cache on its own — a different path is just a
 * different cache key, no explicit invalidation needed.
 */
export function loadUserPacks(options: LoadUserPacksOptions): Promise<LoadUserPacksResult> {
  const path = options.path.trim();
  if (!path) return Promise.resolve({ packs: [], warnings: [] });

  let cached = cache.get(path);
  if (!cached) {
    cached = loadUncached({ ...options, path });
    cache.set(path, cached);
  }
  return cached;
}

/** Test-only escape hatch to force the next loadUserPacks() call for a path to re-scan. */
export function resetUserPacksCache(): void {
  cache.clear();
}
