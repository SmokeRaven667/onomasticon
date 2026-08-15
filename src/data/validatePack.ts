import { validatePackSchema } from "./schemas.js";
import type {
  Derivation,
  Format,
  Pack,
  PackValidationResult,
  Slot,
  ValidationError,
} from "./types.js";

const TOKEN_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

function extractTokens(pattern: string): string[] {
  const tokens: string[] = [];
  for (const match of pattern.matchAll(TOKEN_PATTERN)) {
    const name = match[1];
    if (name !== undefined) tokens.push(name);
  }
  return tokens;
}

/**
 * True if this slot always resolves to a value with no parent/kin context.
 *
 * Only `derived` slots are genuinely uncertain: the schema gives lexicon/procedural
 * slots no probability/chance field, so an `optional` lexicon or procedural slot still
 * resolves every time it's asked to — "optional" only means a format is allowed to
 * leave it out of its pattern. Whether it's visible in the rendered name is controlled
 * by which *format* gets picked (via format weights), not by the slot failing to resolve.
 */
function resolvesStandalone(slot: Slot): boolean {
  return slot.kind !== "derived";
}

function checkFormats(slots: Record<string, Slot>, formats: Format[]): ValidationError[] {
  const errors: ValidationError[] = [];
  let hasStandaloneFormat = false;

  formats.forEach((format, index) => {
    const requires = new Set(format.requires ?? []);
    const path = `config.formats[${index}]`;

    for (const name of requires) {
      if (!(name in slots)) {
        errors.push({
          code: "unknown-slot-in-requires",
          message: `Format ${index} lists "${name}" in requires, but no slot named "${name}" is declared.`,
          path: `${path}.requires`,
        });
      }
    }

    const tokens = extractTokens(format.pattern);
    let needsContext = false;

    for (const name of tokens) {
      const slot = slots[name];
      if (!slot) {
        errors.push({
          code: "unknown-slot-in-format",
          message: `Format ${index} references {${name}}, but no slot named "${name}" is declared.`,
          path: `${path}.pattern`,
        });
        continue;
      }
      if (!resolvesStandalone(slot) && !requires.has(name)) {
        errors.push({
          code: "missing-requires-for-derived-slot",
          message: `Format ${index} references {${name}}, a derived slot that may not resolve without a parent context, but does not list "${name}" in requires.`,
          path,
        });
      }
      if (!resolvesStandalone(slot)) needsContext = true;
    }

    if (!needsContext) hasStandaloneFormat = true;
  });

  if (formats.length > 0 && !hasStandaloneFormat) {
    errors.push({
      code: "no-standalone-format",
      message:
        "No format is guaranteed to resolve without a parent/kin context. At least one format must reference only non-optional lexicon/procedural slots.",
      path: "config.formats",
    });
  }

  return errors;
}

function checkDerivations(
  slots: Record<string, Slot>,
  derivations: Derivation[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const producedBy = new Map<string, number>();

  derivations.forEach((derivation, index) => {
    const path = `config.derivations[${index}]`;

    const target = slots[derivation.produces];
    if (!target) {
      errors.push({
        code: "derivation-produces-unknown-slot",
        message: `Derivation "${derivation.id}" produces "${derivation.produces}", which is not a declared slot.`,
        path: `${path}.produces`,
      });
    } else if (target.kind !== "derived") {
      errors.push({
        code: "derivation-produces-non-derived-slot",
        message: `Derivation "${derivation.id}" produces "${derivation.produces}", which is a "${target.kind}" slot, not a "derived" slot.`,
        path: `${path}.produces`,
      });
    } else {
      producedBy.set(derivation.produces, (producedBy.get(derivation.produces) ?? 0) + 1);
    }

    if (!(derivation.source in slots)) {
      errors.push({
        code: "derivation-source-unknown-slot",
        message: `Derivation "${derivation.id}" reads source "${derivation.source}", which is not a declared slot.`,
        path: `${path}.source`,
      });
    }
  });

  for (const [name, slot] of Object.entries(slots)) {
    if (slot.kind === "derived" && !producedBy.has(name)) {
      errors.push({
        code: "derived-slot-without-derivation",
        message: `Slot "${name}" is "derived" but no entry in config.derivations produces it.`,
        path: `config.slots.${name}`,
      });
    }
  }

  return errors;
}

function checkLexiconRefs(pack: Pack, slots: Record<string, Slot>): ValidationError[] {
  const errors: ValidationError[] = [];
  const lexiconRefs = pack.lexiconRefs ?? {};

  for (const [name, slot] of Object.entries(slots)) {
    if (slot.kind === "lexicon" && !(slot.lexicon in lexiconRefs)) {
      errors.push({
        code: "lexicon-ref-not-found",
        message: `Slot "${name}" references lexicon key "${slot.lexicon}", which is not present in lexiconRefs.`,
        path: `config.slots.${name}.lexicon`,
      });
    }
  }

  return errors;
}

function runSemanticChecks(pack: Pack): ValidationError[] {
  if (pack.strategy !== "template" || !pack.config) return [];

  const { slots, formats, derivations = [] } = pack.config;

  return [
    ...checkLexiconRefs(pack, slots),
    ...checkFormats(slots, formats),
    ...checkDerivations(slots, derivations),
  ];
}

export function validatePackData(data: unknown): PackValidationResult {
  if (!validatePackSchema(data)) {
    const errors: ValidationError[] = (validatePackSchema.errors ?? []).map((error) => ({
      code: `schema:${error.keyword}`,
      message: `${error.instancePath || "(root)"} ${error.message ?? "is invalid"}`,
      path: error.instancePath || undefined,
    }));
    return { valid: false, errors };
  }

  const pack = data as unknown as Pack;
  const errors = runSemanticChecks(pack);
  return { valid: errors.length === 0, errors, pack: errors.length === 0 ? pack : undefined };
}
