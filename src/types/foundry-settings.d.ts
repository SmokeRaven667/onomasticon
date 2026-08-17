export {};

/**
 * Augments fvtt-types' closed `SettingConfig` union with Onomasticon's own setting, so
 * `game.settings.register`/`.get`/`.set` all type-check for it the same way they do for
 * Foundry's built-in settings. See `module/settings.ts` for where it's actually registered.
 *
 * Needs a top-level `export {}` to make this file a real module — otherwise TypeScript
 * treats `declare module "..."` as declaring a brand new (conflicting) ambient module
 * instead of augmenting the real one, which breaks every other augmentation of the same
 * module path project-wide (including foundry-hooks.d.ts's).
 */
declare module "fvtt-types/configuration" {
  interface SettingConfig {
    /** Directory (relative to Foundry's Data root) scanned for user-authored pack JSON files. */
    "onomasticon.userPackPath": string;
  }
}
