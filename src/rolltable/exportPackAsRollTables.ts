import type { Registry } from "../data/types.js";

export interface ExportedRollTable {
  /** The pack's local key for this lexicon (a slot's `lexicon` value, or a strategy's own config field like markov's `corpus`) — not the lexicon's own id, since one lexicon can be referenced under different local names by different packs. */
  lexiconKey: string;
  table: RollTable.Implementation;
}

/**
 * Exports every lexicon a pack references (`pack.lexiconRefs`) as its own `RollTable` — raw
 * word lists, not pre-assembled full names, per this codestep's key decision: a table of
 * surnames is more broadly useful standalone (a GM rolling a quick one at the table) than one
 * of finished names tied to a specific format. Works for any strategy, not just `template` —
 * a markov pack's training corpus is still a lexicon referenced via `lexiconRefs`.
 */
export async function exportPackAsRollTables(
  packId: string,
  registry: Registry,
): Promise<ExportedRollTable[]> {
  const pack = registry.packs.get(packId);
  if (!pack) {
    throw new Error(`exportPackAsRollTables: no pack registered with id "${packId}"`);
  }

  const lexiconRefs = pack.lexiconRefs ?? {};
  const refEntries = Object.entries(lexiconRefs);
  if (refEntries.length === 0) {
    throw new Error(`exportPackAsRollTables: pack "${packId}" references no lexicons to export`);
  }

  const exported: ExportedRollTable[] = [];
  for (const [lexiconKey, lexiconId] of refEntries) {
    const lexicon = registry.lexicons.get(lexiconId);
    if (!lexicon) {
      throw new Error(
        `exportPackAsRollTables: lexicon "${lexiconId}" (referenced as "${lexiconKey}" by pack "${packId}") was not supplied`,
      );
    }

    const results = lexicon.entries.map((entry) => ({
      type: CONST.TABLE_RESULT_TYPES.TEXT,
      text: entry.value,
      weight: entry.weight ?? 1,
      range: [1, 1] as [number, number],
    }));

    const table = await RollTable.create({
      name: `${pack.label ?? pack.id} — ${lexicon.label ?? lexiconKey}`,
      results,
    });
    if (!table) {
      throw new Error(
        `exportPackAsRollTables: failed to create a RollTable for lexicon "${lexiconId}"`,
      );
    }
    // Recomputes each result's range from its weight — created results above only carry a
    // placeholder range, since the correct one depends on every other result's weight too.
    await table.normalize();

    exported.push({ lexiconKey, table });
  }

  return exported;
}
