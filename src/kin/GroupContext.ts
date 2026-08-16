/**
 * Backs `shareWithin`: resolved slot values for an in-progress kin group, keyed by
 * `groupId` and then by the slot's `shareWithin` value (not by slot name — this is what
 * lets `family` and `clan`, two different slots, both use `shareWithin: "kin"` and share
 * the same key independently of a third slot sharing under a different key).
 *
 * A single `groupId` can outlive any one `generate()` call (that's the whole point — a
 * second call in the same group reads back what the first call stored), so this has to be
 * a store that lives *outside* any single generation, not local state inside `resolveSlot`.
 */
export class GroupContext {
  #groups = new Map<string, Map<string, string>>();

  /** Returns the shared value for `shareKey` within `groupId`, if one has been set yet. */
  get(groupId: string, shareKey: string): string | undefined {
    return this.#groups.get(groupId)?.get(shareKey);
  }

  /**
   * Returns the existing shared value for `shareKey` within `groupId`, or computes, stores,
   * and returns a new one via `resolve` if none exists yet. `resolve` runs (and consumes RNG)
   * only on that first call for a given group/key pair — later calls just read the cached
   * value back, which is what keeps a shared slot from re-rolling.
   */
  getOrResolve(groupId: string, shareKey: string, resolve: () => string): string {
    const existing = this.get(groupId, shareKey);
    if (existing !== undefined) return existing;

    const value = resolve();
    let group = this.#groups.get(groupId);
    if (!group) {
      group = new Map();
      this.#groups.set(groupId, group);
    }
    group.set(shareKey, value);
    return value;
  }

  /** Discards all shared state for one group, e.g. once a "family of N" workflow finishes. */
  clear(groupId: string): void {
    this.#groups.delete(groupId);
  }
}

/**
 * Process-wide default store used by `generate()`/`generateWithRegistry()`, whose public
 * options only carry a `groupId` string (not a `GroupContext` instance) — there has to be
 * somewhere for that string to actually mean something across separate calls. Tests and
 * lower-level callers that construct `generateWithTemplate()` input directly can instead
 * inject their own `GroupContext` for isolation instead of relying on this singleton.
 */
export const defaultGroupContext = new GroupContext();
