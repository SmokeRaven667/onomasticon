import type { Result } from "../types.js";

/**
 * Bulk-creates one Actor per roster result, named after the generated result. Uses whichever
 * Actor subtype the active world/system registers first (`game.documentTypes.Actor[0]`) —
 * same "no game-system coupling" principle as step 19's `applyToActor`: never hardcode a
 * system-specific type like `"npc"`/`"character"`, read whatever's actually registered.
 */
export async function createRosterActors(
  results: readonly Result[],
): Promise<Actor.Implementation[]> {
  // Safe: only ever called from a user-triggered UI action, long after Foundry's "setup" hook
  // (where game.documentTypes becomes available) has fired — same reasoning as this
  // project's other game.* access sites (see step 09/13/17/19/20's precedent).
  const type = game.documentTypes!.Actor[0];
  if (!type) {
    throw new Error("createRosterActors: no Actor type is registered for this world");
  }

  const created = await Actor.createDocuments(
    results.map((result) => ({ name: result.full, type })),
  );
  return created ?? [];
}
