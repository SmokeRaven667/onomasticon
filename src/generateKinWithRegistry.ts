import type { Registry } from "./data/types.js";
import { generateWithRegistry } from "./generateWithRegistry.js";
import { randomSeed } from "./rng/mulberry32.js";
import type { GenerateContext, Result } from "./types.js";

export interface GenerateKinMemberOptions {
  variant?: string;
  /** Omit to mint a fresh seed for this member, same as GenerateOptions.seed. */
  seed?: number;
}

export interface GenerateKinOptions {
  /**
   * Per-member overrides, in call order. A shorter array than `count` (or omitting this
   * entirely) just generates the remaining members with no variant/seed override.
   */
  members?: readonly GenerateKinMemberOptions[];
  /** Kin group id shared by every member. Omit to mint a fresh one for this call. */
  groupId?: string;
}

/**
 * Generates `count` results as one flat kin group: every member shares slots marked
 * `shareWithin` (step 11) under the same `groupId`, and every member after the first
 * generates with the first member's resolved parts as `context.parent`, so a `derived`
 * slot like a patronymic (step 12) resolves against the first member.
 *
 * Deliberately flat, per v0.2 scope: every later member derives from the same
 * head-of-family (index 0), never from the member before it — a generational chain
 * (grandparent -> parent -> child) is a v0.4+ stretch, not this step's job.
 *
 * Registry-agnostic (same split as generate.ts/generateWithRegistry.ts) so `GeneratorApp`
 * can call this directly with the browser's fetch-based registry without pulling in
 * `generate.ts`'s Node-only `loadRegistry()` import.
 */
export function generateKinWithRegistry(
  packId: string,
  count: number,
  options: GenerateKinOptions,
  registry: Registry,
): Result[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`generateKin: count must be a positive integer, got ${count}`);
  }

  const groupId = options.groupId ?? `kin-${randomSeed()}`;
  const members = options.members ?? [];

  const results: Result[] = [];
  for (let i = 0; i < count; i++) {
    const member = members[i] ?? {};
    const context: GenerateContext = i === 0 ? { groupId } : { groupId, parent: results[0]!.parts };
    results.push(
      generateWithRegistry(
        packId,
        { seed: member.seed, variant: member.variant, context },
        registry,
      ),
    );
  }

  return results;
}
