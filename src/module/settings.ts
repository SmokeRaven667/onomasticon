import { MODULE_ID } from "./constants.js";

/** Key under MODULE_ID's namespace — the directory the loader scans for user-authored packs. */
export const USER_PACK_PATH_SETTING = "userPackPath";

/**
 * Registers the (world-scope) setting that points the loader at a GM-configured directory
 * of user-authored pack JSON files, in addition to the bundled ones — see
 * `browser/loadFullRegistry.ts` for where it's actually read and acted on.
 *
 * Registered at `init` per Foundry convention (settings must be registered between the
 * `init` and `i18nInit` hooks) — this is just cheap bookkeeping, not the actual directory
 * scan. The scan itself stays lazy, same as bundled packs: nothing is fetched until the
 * registry is first needed.
 */
export function registerSettings(): void {
  Hooks.once("init", () => {
    // Safe: registration only ever runs inside the init hook, and Foundry's own docs say
    // "Settings are registered between the init and i18nInit hook events" — game.settings
    // already exists by the time this callback fires.
    game.settings!.register(MODULE_ID, USER_PACK_PATH_SETTING, {
      name: "ONOMASTICON.Settings.UserPackPath.Name",
      hint: "ONOMASTICON.Settings.UserPackPath.Hint",
      scope: "world",
      config: true,
      type: String,
      default: "",
    });
  });
}
