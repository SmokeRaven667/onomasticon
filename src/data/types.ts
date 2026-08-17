export interface BaseSlot {
  shareWithin?: string;
}

export interface LexiconSlot extends BaseSlot {
  kind: "lexicon";
  lexicon: string;
  variants?: string[];
  optional?: boolean;
}

export interface ProceduralSlot extends BaseSlot {
  kind: "procedural";
  pattern: string;
  optional?: boolean;
}

export interface DerivedSlot extends BaseSlot {
  kind: "derived";
}

export type Slot = LexiconSlot | ProceduralSlot | DerivedSlot;

export interface Format {
  weight?: number;
  pattern: string;
  requires?: string[];
}

export interface DerivationStrip {
  pattern: string;
  replace?: string;
}

export interface Derivation {
  id: string;
  produces: string;
  source: string;
  weight?: number;
  strip?: DerivationStrip;
  variants: Record<string, string>;
}

export interface TemplateConfig {
  slots: Record<string, Slot>;
  formats: Format[];
  derivations?: Derivation[];
}

export interface MarkovConfig {
  /** Key into the pack's lexiconRefs map, pointing at the training-word lexicon. */
  corpus: string;
  /** N-gram context length in characters. */
  order: number;
  minLength?: number;
  maxLength?: number;
}

export interface Pack {
  schemaVersion: 1;
  id: string;
  label?: string;
  description?: string;
  author?: string;
  packVersion?: string;
  tags?: string[];
  strategy: string;
  lexiconRefs?: Record<string, string>;
  config?: TemplateConfig | MarkovConfig;
}

export interface LexiconEntry {
  value: string;
  variants?: string[];
  weight?: number;
  tags?: string[];
}

export interface Lexicon {
  schemaVersion: 1;
  id: string;
  label?: string;
  tags?: string[];
  entries: LexiconEntry[];
}

export interface ValidationError {
  /** Short machine-readable code, e.g. "unknown-slot-in-format". Stable — safe to match on in tests/tooling. */
  code: string;
  /** Human-readable explanation, safe to show a pack author directly. */
  message: string;
  /** Dotted/bracketed path into the source document, e.g. "config.formats[1].pattern". */
  path?: string;
}

export interface PackValidationResult {
  valid: boolean;
  errors: ValidationError[];
  pack?: Pack;
}

export interface LexiconValidationResult {
  valid: boolean;
  errors: ValidationError[];
  lexicon?: Lexicon;
}

/**
 * A resolved set of packs and lexicons, keyed by id, ready for generation. How it gets
 * populated differs by environment: `registry.ts` (Node, `fs`-based) vs.
 * `browser/loadBundledRegistry.ts` (fetch-based, for use inside Foundry) — both produce
 * this same shape so `generateWithRegistry()` doesn't care which one it was given.
 */
export interface Registry {
  packs: ReadonlyMap<string, Pack>;
  lexicons: ReadonlyMap<string, Lexicon>;
}
