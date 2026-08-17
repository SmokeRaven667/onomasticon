export interface SlotFormEntry {
  name: string;
  kind: "lexicon" | "procedural" | "derived";
  /** `kind: "lexicon"` only — an existing lexicon id already present in the registry (this UI doesn't author lexicon content, only packs). */
  lexicon?: string;
  /** `kind: "lexicon"` only — comma-separated variant keys, e.g. "masc, fem, neutral". */
  variants?: string;
  /** `kind: "procedural"` only. */
  pattern?: string;
  optional?: boolean;
  shareWithin?: string;
}

export interface FormatFormEntry {
  pattern: string;
  weight?: number;
  /** Comma-separated slot names. */
  requires?: string;
}

export interface PackFormState {
  id: string;
  label?: string;
  description?: string;
  author?: string;
  packVersion?: string;
  /** Comma-separated tags. */
  tags?: string;
  slots: SlotFormEntry[];
  formats: FormatFormEntry[];
  /**
   * Raw JSON text for `config.derivations`, hand-edited rather than form-built — the v1
   * authoring UI covers slots/formats only, per this codestep's open question, resolved in
   * favor of the simpler option. Left empty/undefined, no `derivations` key is produced.
   */
  derivationsJson?: string;
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Turns UI-collected form state into a plain object shaped like a `template`-strategy Pack,
 * ready for `validatePackData`. Deliberately returns `unknown`, not `Pack` — this is
 * untrusted, hand-assembled data until the validator says otherwise, same as any other pack
 * source (step 03's loader, step 17's user-directory scan, step 14's `registerPack`).
 *
 * Only the `template` strategy is supported: a markov pack's config shape (corpus/order/
 * min-max length, step 18) has nothing in common with "slots, formats, derivations," which is
 * exactly what this step's own deliverable scopes the authoring UI to.
 *
 * Each lexicon-kind slot uses its own name as its local `lexiconRefs` key (`slots.given.lexicon
 * === "given"`, `lexiconRefs.given === <picked lexicon id>`) — the schema's local-name
 * indirection exists so packs can share or rename lexicon references cleverly, but this v1
 * form doesn't expose that; a pack author who wants it can still hand-edit the saved JSON.
 */
export function buildPackFromForm(form: PackFormState): unknown {
  const lexiconRefs: Record<string, string> = {};
  const slots: Record<string, unknown> = {};

  for (const slot of form.slots) {
    if (!slot.name.trim()) continue;

    if (slot.kind === "lexicon") {
      if (slot.lexicon) lexiconRefs[slot.name] = slot.lexicon;
      slots[slot.name] = {
        kind: "lexicon",
        lexicon: slot.name,
        ...(slot.variants?.trim() ? { variants: splitList(slot.variants) } : {}),
        ...(slot.optional ? { optional: true } : {}),
        ...(slot.shareWithin?.trim() ? { shareWithin: slot.shareWithin.trim() } : {}),
      };
    } else if (slot.kind === "procedural") {
      slots[slot.name] = {
        kind: "procedural",
        pattern: slot.pattern ?? "",
        ...(slot.optional ? { optional: true } : {}),
        ...(slot.shareWithin?.trim() ? { shareWithin: slot.shareWithin.trim() } : {}),
      };
    } else {
      slots[slot.name] = {
        kind: "derived",
        ...(slot.shareWithin?.trim() ? { shareWithin: slot.shareWithin.trim() } : {}),
      };
    }
  }

  const formats = form.formats
    .filter((format) => format.pattern.trim().length > 0)
    .map((format) => ({
      pattern: format.pattern,
      ...(format.weight !== undefined ? { weight: format.weight } : {}),
      ...(format.requires?.trim() ? { requires: splitList(format.requires) } : {}),
    }));

  let derivations: unknown;
  if (form.derivationsJson?.trim()) {
    try {
      derivations = JSON.parse(form.derivationsJson);
    } catch (error) {
      throw new Error(
        `buildPackFromForm: derivations JSON is invalid: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  return {
    schemaVersion: 1,
    id: form.id,
    ...(form.label?.trim() ? { label: form.label.trim() } : {}),
    ...(form.description?.trim() ? { description: form.description.trim() } : {}),
    ...(form.author?.trim() ? { author: form.author.trim() } : {}),
    ...(form.packVersion?.trim() ? { packVersion: form.packVersion.trim() } : {}),
    ...(form.tags?.trim() ? { tags: splitList(form.tags) } : {}),
    strategy: "template",
    lexiconRefs,
    config: {
      slots,
      formats,
      ...(derivations !== undefined ? { derivations } : {}),
    },
  };
}
