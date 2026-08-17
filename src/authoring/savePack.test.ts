import { afterEach, describe, expect, it, vi } from "vitest";
import { resetUserPacksCache } from "../browser/loadUserPacks.js";
import { MODULE_ID } from "../module/constants.js";
import { USER_PACK_PATH_SETTING } from "../module/settings.js";
import { resetSettingsStub } from "../test/foundryStubs.js";
import { savePack } from "./savePack.js";

const VALID_PACK = {
  schemaVersion: 1,
  id: "authored.two-slot",
  strategy: "template",
  lexiconRefs: { given: "test-given" },
  config: {
    slots: { given: { kind: "lexicon", lexicon: "given" } },
    formats: [{ pattern: "{given}" }],
  },
};

afterEach(() => {
  resetSettingsStub();
  resetUserPacksCache();
});

describe("savePack", () => {
  it("throws for invalid pack data before ever attempting an upload", async () => {
    const uploadImpl = vi.fn();
    await expect(savePack({ schemaVersion: 1 }, { uploadImpl })).rejects.toThrow(
      /invalid pack data/,
    );
    expect(uploadImpl).not.toHaveBeenCalled();
  });

  it("throws when no User Pack Directory is configured, before attempting an upload", async () => {
    game.settings!.set(MODULE_ID, USER_PACK_PATH_SETTING, "");
    const uploadImpl = vi.fn();
    await expect(savePack(VALID_PACK, { uploadImpl })).rejects.toThrow(
      /configure a User Pack Directory/,
    );
    expect(uploadImpl).not.toHaveBeenCalled();
  });

  it("uploads the validated pack as <id>.json into the configured directory", async () => {
    game.settings!.set(MODULE_ID, USER_PACK_PATH_SETTING, "onomasticon-packs");
    const uploadImpl = vi.fn(async (_source: string, _path: string, _file: File) => ({
      status: "success",
      path: "onomasticon-packs/authored.two-slot.json",
    }));

    const result = await savePack(VALID_PACK, { uploadImpl });

    expect(uploadImpl).toHaveBeenCalledTimes(1);
    const [source, path, file] = uploadImpl.mock.calls[0]!;
    expect(source).toBe("data");
    expect(path).toBe("onomasticon-packs");
    expect(file.name).toBe("authored.two-slot.json");
    expect(await file.text()).toContain('"id": "authored.two-slot"');

    expect(result.pack.id).toBe("authored.two-slot");
    expect(result.path).toBe("onomasticon-packs/authored.two-slot.json");
  });

  it("throws when the upload fails (FilePicker returns false)", async () => {
    game.settings!.set(MODULE_ID, USER_PACK_PATH_SETTING, "onomasticon-packs");
    const uploadImpl = vi.fn(async () => false as const);

    await expect(savePack(VALID_PACK, { uploadImpl })).rejects.toThrow(/upload of/);
  });
});
