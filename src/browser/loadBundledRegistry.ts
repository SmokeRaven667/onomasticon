import { validateLexiconData } from "../data/validateLexicon.js";
import { validatePackData } from "../data/validatePack.js";
import type { Lexicon, Pack, Registry } from "../data/types.js";

interface ManifestEntry {
  id: string;
  file: string;
}

interface DataManifest {
  packs: ManifestEntry[];
  lexicons: ManifestEntry[];
}

export interface LoadBundledRegistryOptions {
  /** Base URL the manifest and data files are fetched relative to, e.g. "modules/onomasticon/". */
  baseUrl: string;
  /** Injectable for testing; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`loadBundledRegistry: failed to fetch "${url}" (${response.status})`);
  }
  return response.json();
}

async function loadUncached(options: LoadBundledRegistryOptions): Promise<Registry> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`;

  const manifest = (await fetchJson(`${base}data-manifest.json`, fetchImpl)) as DataManifest;
  const errors: string[] = [];

  const packs = new Map<string, Pack>();
  await Promise.all(
    manifest.packs.map(async (entry) => {
      const data = await fetchJson(`${base}${entry.file}`, fetchImpl);
      const result = validatePackData(data);
      if (!result.pack) {
        errors.push(
          `${entry.file}: ${result.errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
        );
        return;
      }
      packs.set(result.pack.id, result.pack);
    }),
  );

  const lexicons = new Map<string, Lexicon>();
  await Promise.all(
    manifest.lexicons.map(async (entry) => {
      const data = await fetchJson(`${base}${entry.file}`, fetchImpl);
      const result = validateLexiconData(data);
      if (!result.lexicon) {
        errors.push(
          `${entry.file}: ${result.errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
        );
        return;
      }
      lexicons.set(result.lexicon.id, result.lexicon);
    }),
  );

  if (errors.length > 0) {
    throw new Error(
      `loadBundledRegistry: bundled packs/lexicons failed validation:\n${errors.join("\n")}`,
    );
  }

  return { packs, lexicons };
}

let cachedPromise: Promise<Registry> | undefined;

/**
 * Fetch-based equivalent of `registry.ts`'s `loadRegistry()`, for use inside Foundry
 * (where `node:fs` doesn't exist). Fetches a small manifest, then every pack/lexicon it
 * lists, and runs them through the exact same environment-agnostic validators from step 03
 * (`validatePackData`/`validateLexiconData` have no `fs` dependency, so they work
 * identically here and in Node).
 *
 * Nothing is fetched until this is first called — not at module `init` — so opening
 * Foundry with the module enabled costs nothing until the generator dialog actually opens.
 *
 * Caches the in-flight/resolved promise so concurrent or repeated calls don't re-fetch;
 * a failed load clears the cache so a later call retries instead of failing forever.
 */
export function loadBundledRegistry(options: LoadBundledRegistryOptions): Promise<Registry> {
  if (!cachedPromise) {
    cachedPromise = loadUncached(options).catch((error: unknown) => {
      cachedPromise = undefined;
      throw error;
    });
  }
  return cachedPromise;
}

/** Test-only escape hatch to force the next loadBundledRegistry() call to re-fetch. */
export function resetBundledRegistryCache(): void {
  cachedPromise = undefined;
}
