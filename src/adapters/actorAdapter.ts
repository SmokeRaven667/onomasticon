import type { Result } from "../types.js";

/**
 * A single function that applies a generated `Result` to an actor. Kept intentionally this
 * narrow (not a class, not a multi-method interface) — everything a system-specific override
 * needs to do differently from the generic fallback is "how do I set the name," nothing more,
 * per this codestep's key decision.
 */
export type ActorAdapter = (actor: Actor.Implementation, result: Result) => Promise<void>;

/** Every system supports the core `name` field on its own Document — this always works, system-specific adapter or not. */
async function genericFallbackAdapter(actor: Actor.Implementation, result: Result): Promise<void> {
  await actor.update({ name: result.full });
}

/**
 * Opt-in per-system overrides, keyed on `game.system.id`. Empty for now — which systems (if
 * any) get a first-class adapter beyond the generic fallback is this step's own open
 * question, deliberately left to actual usage/requests rather than speculative coverage. The
 * generic fallback already satisfies this step's DoD against a system-installed world (name
 * is a core field, not a system-specific one), so shipping zero entries here isn't a gap.
 */
const systemAdapters = new Map<string, ActorAdapter>();

/**
 * Applies `result` to `actor` via whichever adapter is registered for the active
 * `game.system.id`, or the generic fallback if none is. This is the only place in the
 * codebase that's allowed to know a system-specific adapter might exist — callers (the
 * GeneratorApp UI, the public API) never branch on `game.system.id` themselves, keeping the
 * "no import from a game system" non-negotiable intact.
 */
export function applyToActor(actor: Actor.Implementation, result: Result): Promise<void> {
  // Safe: only ever called from a user-triggered UI action, long after Foundry's "setup" hook
  // (where game.system becomes available) has fired — same reasoning as this project's other
  // game.* access sites (see step 09/13/17's game.i18n!/game.settings! precedent).
  const adapter = systemAdapters.get(game.system!.id) ?? genericFallbackAdapter;
  return adapter(actor, result);
}

/** Test-only escape hatch: registers a system-specific adapter, e.g. to prove `applyToActor` prefers it over the generic fallback. */
export function registerSystemAdapterForTest(id: string, adapter: ActorAdapter): void {
  systemAdapters.set(id, adapter);
}

/** Test-only escape hatch: drops every test-registered system adapter. */
export function resetSystemAdaptersForTest(): void {
  systemAdapters.clear();
}
