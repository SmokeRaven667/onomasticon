import type { GenerateOptions, Result } from "../types.js";

/**
 * Augments fvtt-types' closed `HookConfig` union with Onomasticon's own hooks, so
 * `Hooks.call`/`Hooks.callAll`/`Hooks.on` all type-check for them the same way they do for
 * Foundry's built-in hooks. See `generateWithRegistry.ts` for where these actually fire.
 */
declare module "fvtt-types/configuration" {
  namespace Hooks {
    interface HookConfig {
      /** Fired before generation resolves. Returning `false` cancels generation. */
      "onomasticon.preGenerate": (options: GenerateOptions) => boolean | void;
      /** Fired after generation resolves, with the final Result. Not cancelable. */
      "onomasticon.generated": (result: Result) => void;
    }
  }
}
