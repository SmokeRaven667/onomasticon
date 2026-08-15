import type { TemplateContext } from "./strategies/template/index.js";

export interface ResultMeta {
  packId: string;
  strategyId: string;
  /** The seed that produced this result — pass it back via GenerateOptions.seed to replay it exactly. */
  seed: number;
  groupId?: string;
}

/** Every generation call returns this, never a bare string. */
export interface Result {
  full: string;
  parts: Record<string, string>;
  meta: ResultMeta;
}

/**
 * Extends the active strategy's context with generate()-level bookkeeping (`groupId`).
 * `template` is the only strategy in v1, so this couples directly to `TemplateContext`;
 * step 16's strategy registry is where this may need to become strategy-agnostic.
 */
export interface GenerateContext extends TemplateContext {
  groupId?: string;
}

export interface GenerateOptions {
  variant?: string;
  /** Omit to mint a fresh seed (echoed back in Result.meta.seed); pass one to replay a result. */
  seed?: number;
  /** Parent/kin context. Accepted now, consumed once steps 11-12 (kin groups, derivations) exist. */
  context?: GenerateContext;
}
