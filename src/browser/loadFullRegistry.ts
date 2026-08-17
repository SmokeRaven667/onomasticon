import type { Registry } from "../data/types.js";
import { MODULE_ID } from "../module/constants.js";
import { USER_PACK_PATH_SETTING } from "../module/settings.js";
import { loadBundledRegistry, type LoadBundledRegistryOptions } from "./loadBundledRegistry.js";
import { loadUserPacks, type LoadUserPacksOptions } from "./loadUserPacks.js";

export interface LoadFullRegistryOptions extends LoadBundledRegistryOptions {
  /** Injectable for testing; forwarded to loadUserPacks. */
  browseImpl?: LoadUserPacksOptions["browseImpl"];
}

/**
 * Merges the bundled registry with any packs found in the GM-configured user pack
 * directory (step 17) — the entry point `GeneratorApp` and the public API both use instead
 * of `loadBundledRegistry` directly, so runtime-registered packs (`api.registerPack`, step
 * 14) and user-directory packs are both visible everywhere generation happens.
 *
 * Re-merges on every call rather than caching its own snapshot — cheap, since it's just
 * copying a handful of Map entries — so a `registerPack()` call made after the first load
 * (which mutates the shared bundled registry's `packs` Map in place) shows up immediately
 * on the next call here. The expensive I/O underneath (fetching bundled data, scanning the
 * user directory) still only happens once, thanks to `loadBundledRegistry`'s and
 * `loadUserPacks`'s own caches.
 *
 * A user pack whose id collides with an existing one (bundled, another user pack, or a
 * runtime-registered one) is rejected and warned about, never silently overriding it — the
 * same principle `registerPack` and `registerStrategy` already apply (step 14).
 */
export async function loadFullRegistry(options: LoadFullRegistryOptions): Promise<Registry> {
  const bundled = await loadBundledRegistry(options);

  // Safe: this only ever runs once GeneratorApp/the public API actually need the registry,
  // long after Foundry's init hook (and this project's other game.* access sites already
  // establish the same "safe well after the relevant hook" precedent, e.g. game.i18n!).
  const path = String(game.settings!.get(MODULE_ID, USER_PACK_PATH_SETTING) ?? "").trim();
  if (!path) return bundled;

  const { packs: userPacks, warnings } = await loadUserPacks({
    path,
    browseImpl: options.browseImpl,
    fetchImpl: options.fetchImpl,
  });

  for (const warning of warnings) {
    console.warn(`Onomasticon | ${warning}`);
    ui.notifications?.warn(`Onomasticon: ${warning}`);
  }

  const packs = new Map(bundled.packs);
  for (const pack of userPacks) {
    if (packs.has(pack.id)) {
      const message = `user pack "${pack.id}" conflicts with an existing pack id — rejected, not loaded`;
      console.warn(`Onomasticon | ${message}`);
      ui.notifications?.warn(`Onomasticon: ${message}`);
      continue;
    }
    packs.set(pack.id, pack);
  }

  return { packs, lexicons: bundled.lexicons };
}
