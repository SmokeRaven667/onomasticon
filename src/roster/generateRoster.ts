import type { Registry } from "../data/types.js";
import { generateWithRegistry } from "../generateWithRegistry.js";
import type { Result } from "../types.js";

export interface RosterMemberOptions {
  variant?: string;
  /** Omit to mint a fresh seed for this member, same as GenerateOptions.seed. */
  seed?: number;
}

export interface GenerateRosterOptions {
  /** Variant applied to every member with no per-member override in `members`. */
  variant?: string;
  /**
   * Per-member overrides, in call order. A shorter array than `count` (or omitting this
   * entirely) just generates the remaining members with no variant/seed override.
   */
  members?: readonly RosterMemberOptions[];
}

/**
 * Generates `count` fully independent results — no shared surname/kin context, unlike
 * `generateKinWithRegistry`. A roster is a set of unrelated NPCs (the real-world case this
 * step targets: a GM needing a session's worth of names in one action), not a family.
 *
 * Registry-agnostic (same split as generate.ts/generateWithRegistry.ts) so `GeneratorApp` can
 * call this directly with the browser's fetch-based registry.
 */
export function generateRosterWithRegistry(
  packId: string,
  count: number,
  options: GenerateRosterOptions,
  registry: Registry,
): Result[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`generateRoster: count must be a positive integer, got ${count}`);
  }

  const members = options.members ?? [];
  return Array.from({ length: count }, (_, index) => {
    const member = members[index] ?? {};
    return generateWithRegistry(
      packId,
      { seed: member.seed, variant: member.variant ?? options.variant },
      registry,
    );
  });
}
