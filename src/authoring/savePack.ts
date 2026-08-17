import type { Pack, PackValidationResult } from "../data/types.js";
import { validatePackData } from "../data/validatePack.js";
import { resetUserPacksCache } from "../browser/loadUserPacks.js";
import { MODULE_ID } from "../module/constants.js";
import { USER_PACK_PATH_SETTING } from "../module/settings.js";

export interface FilePickerUploadResult {
  status: string;
  path: string;
}

export interface SavePackOptions {
  /** Injectable for testing; defaults to `foundry.applications.apps.FilePicker.upload`. */
  uploadImpl?: (
    source: string,
    path: string,
    file: File,
  ) => Promise<FilePickerUploadResult | false | void>;
}

export interface SavePackResult {
  pack: Pack;
  /** The uploaded file's server-relative path, as reported by FilePicker. */
  path: string;
}

/**
 * Validates untrusted form-built pack data through the exact same step-03 validator every
 * other pack source uses, then uploads it as a JSON file into the GM-configured user pack
 * directory (step 17's `userPackPath` setting) so it survives a reload — a purely in-memory
 * `registerPack` (step 14) wouldn't satisfy this step's DoD ("build and *save* ... entirely
 * through the UI"). Requires the setting to already be configured rather than picking a
 * fallback location on the author's behalf; there's no directory step 17's loader is
 * guaranteed to be scanning otherwise.
 *
 * Busts `loadUserPacks`'s cache for that path after a successful upload, rather than also
 * calling `registerPack` to make it immediately visible — the very next `loadFullRegistry()`
 * call (step 17) picks the new file straight up off disk, so there's exactly one path a
 * saved pack becomes visible through, not two that could drift.
 */
export async function savePack(
  data: unknown,
  options: SavePackOptions = {},
): Promise<SavePackResult> {
  const result: PackValidationResult = validatePackData(data);
  if (!result.pack) {
    throw new Error(
      `savePack: invalid pack data:\n${result.errors.map((e) => `[${e.code}] ${e.message}`).join("\n")}`,
    );
  }

  // Safe: only ever called from a user-triggered UI action, long after Foundry's "setup" hook
  // (where game.settings becomes available) has fired — same reasoning as this project's
  // other game.* access sites (see step 09/13/17/19/20's precedent).
  const path = String(game.settings!.get(MODULE_ID, USER_PACK_PATH_SETTING) ?? "").trim();
  if (!path) {
    throw new Error(
      "savePack: configure a User Pack Directory in module settings before saving a pack",
    );
  }

  const fileName = `${result.pack.id}.json`;
  const file = new File([JSON.stringify(result.pack, null, 2)], fileName, {
    type: "application/json",
  });

  const upload =
    options.uploadImpl ??
    ((source: string, target: string, uploadedFile: File) =>
      foundry.applications.apps.FilePicker.upload(source, target, uploadedFile));
  const uploadResult = await upload("data", path, file);

  if (!uploadResult || !uploadResult.path) {
    throw new Error(`savePack: upload of "${fileName}" to "${path}" failed`);
  }

  resetUserPacksCache();

  return { pack: result.pack, path: uploadResult.path };
}
