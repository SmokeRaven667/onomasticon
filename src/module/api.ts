import { loadBundledRegistry } from "../browser/loadBundledRegistry.js";
import type { Pack } from "../data/types.js";
import { validatePackData } from "../data/validatePack.js";
import { generateKinWithRegistry, type GenerateKinOptions } from "../generateKinWithRegistry.js";
import { generateWithRegistry } from "../generateWithRegistry.js";
import { registerStrategy, type StrategyImplementation } from "../strategies/registry.js";
import type { GenerateOptions, Result } from "../types.js";
import type { GeneratorApp } from "../apps/GeneratorApp.js";
import { MODULE_ID } from "./constants.js";
import { openGenerator } from "./launchPoint.js";

export interface PackSummary {
  id: string;
  label: string;
  description?: string;
  tags: string[];
}

export interface OnomasticonApi {
  openGenerator: () => GeneratorApp;
  generate: (packId: string, options?: GenerateOptions) => Promise<Result>;
  generateKin: (packId: string, count: number, options?: GenerateKinOptions) => Promise<Result[]>;
  listPacks: () => Promise<PackSummary[]>;
  registerStrategy: (id: string, implementation: StrategyImplementation) => void;
  registerPack: (data: unknown) => Promise<Pack>;
}

function loadRegistry() {
  return loadBundledRegistry({ baseUrl: `modules/${MODULE_ID}/` });
}

async function generate(packId: string, options: GenerateOptions = {}): Promise<Result> {
  return generateWithRegistry(packId, options, await loadRegistry());
}

async function generateKin(
  packId: string,
  count: number,
  options: GenerateKinOptions = {},
): Promise<Result[]> {
  return generateKinWithRegistry(packId, count, options, await loadRegistry());
}

async function listPacks(): Promise<PackSummary[]> {
  const registry = await loadRegistry();
  return [...registry.packs.values()].map((pack) => ({
    id: pack.id,
    label: pack.label ?? pack.id,
    description: pack.description,
    tags: pack.tags ?? [],
  }));
}

/**
 * Validates untrusted pack data through the exact same step-03 validator bundled packs go
 * through (no relaxed rules for runtime-registered ones), then adds it to the shared
 * registry so it's immediately generatable and shows up in `listPacks()`/the step-08
 * picker. Rejects rather than silently overriding an id collision — same "reject and warn"
 * principle as `registerStrategy` and (per its own open question) step 17's directory
 * loader. Doesn't touch lexicons: a registered pack must reference lexicon ids the registry
 * already has (bundled, or from a prior registration) — bundling custom lexicons alongside
 * a pack is step 17's job (a full user-content story), not this minimal runtime primitive's.
 */
async function registerPack(data: unknown): Promise<Pack> {
  const registry = await loadRegistry();
  const result = validatePackData(data);
  if (!result.pack) {
    throw new Error(
      `registerPack: invalid pack data:\n${result.errors.map((e) => `[${e.code}] ${e.message}`).join("\n")}`,
    );
  }
  if (registry.packs.has(result.pack.id)) {
    throw new Error(`registerPack: a pack is already registered under id "${result.pack.id}"`);
  }
  (registry.packs as Map<string, Pack>).set(result.pack.id, result.pack);
  return result.pack;
}

function buildApi(): OnomasticonApi {
  return { openGenerator, generate, generateKin, listPacks, registerStrategy, registerPack };
}

/**
 * The only supported integration surface for other modules — nothing else exported from
 * this package is guaranteed stable across versions. Assigned once, in the `init` hook, so
 * there's exactly one writer of `module.api` (earlier, `launchPoint.ts` wrote a stepping-
 * stone `{ openGenerator }` here directly; that's now folded into this full object instead
 * of two separate `init` handlers racing to set the same property).
 */
export function registerApi(): void {
  Hooks.once("init", () => {
    const module = game.modules?.get(MODULE_ID);
    if (module) {
      (module as unknown as { api?: OnomasticonApi }).api = buildApi();
    }
  });
}
