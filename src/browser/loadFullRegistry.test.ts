import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBundledRegistryCache } from "./loadBundledRegistry.js";
import { loadFullRegistry } from "./loadFullRegistry.js";
import { resetUserPacksCache } from "./loadUserPacks.js";
import { resetSettingsStub } from "../test/foundryStubs.js";
import { MODULE_ID } from "../module/constants.js";
import { USER_PACK_PATH_SETTING } from "../module/settings.js";

const GIVEN_LEXICON = { schemaVersion: 1, id: "test-given", entries: [{ value: "Ashan" }] };

const BUNDLED_PACK = {
  schemaVersion: 1,
  id: "bundled.pack",
  strategy: "template",
  lexiconRefs: { given: "test-given" },
  config: {
    slots: { given: { kind: "lexicon", lexicon: "given" } },
    formats: [{ pattern: "{given}" }],
  },
};

const USER_PACK = {
  schemaVersion: 1,
  id: "user.pack",
  strategy: "template",
  lexiconRefs: { given: "test-given" },
  config: {
    slots: { given: { kind: "lexicon", lexicon: "given" } },
    formats: [{ pattern: "{given}" }],
  },
};

const MANIFEST = {
  packs: [{ id: "bundled.pack", file: "packs/bundled.pack.json" }],
  lexicons: [{ id: "test-given", file: "lexicons/test-given.json" }],
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function makeFetch(routes: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return url in routes ? jsonResponse(routes[url]) : jsonResponse(undefined, false, 404);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  resetBundledRegistryCache();
  resetUserPacksCache();
  resetSettingsStub();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadFullRegistry", () => {
  it("returns the bundled registry unchanged when no user pack path is configured", async () => {
    const fetchImpl = makeFetch({
      "modules/onomasticon/data-manifest.json": MANIFEST,
      "modules/onomasticon/packs/bundled.pack.json": BUNDLED_PACK,
      "modules/onomasticon/lexicons/test-given.json": GIVEN_LEXICON,
    });

    const registry = await loadFullRegistry({ baseUrl: "modules/onomasticon/", fetchImpl });

    expect(registry.packs.size).toBe(1);
    expect(registry.packs.has("bundled.pack")).toBe(true);
  });

  it("merges a user pack into the registry when a path is configured", async () => {
    game.settings!.set(MODULE_ID, USER_PACK_PATH_SETTING, "worlds/my-world/onomasticon-packs");

    const fetchImpl = makeFetch({
      "modules/onomasticon/data-manifest.json": MANIFEST,
      "modules/onomasticon/packs/bundled.pack.json": BUNDLED_PACK,
      "modules/onomasticon/lexicons/test-given.json": GIVEN_LEXICON,
      "worlds/my-world/onomasticon-packs/user.pack.json": USER_PACK,
    });
    const browseImpl = vi.fn(async () => ({
      files: ["worlds/my-world/onomasticon-packs/user.pack.json"],
    }));

    const registry = await loadFullRegistry({
      baseUrl: "modules/onomasticon/",
      fetchImpl,
      browseImpl,
    });

    expect(registry.packs.has("bundled.pack")).toBe(true);
    expect(registry.packs.has("user.pack")).toBe(true);
    expect(registry.packs.size).toBe(2);
  });

  it("rejects a user pack id colliding with a bundled one, warns, and keeps the bundled pack", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    game.settings!.set(MODULE_ID, USER_PACK_PATH_SETTING, "worlds/my-world/onomasticon-packs");

    const conflictingUserPack = { ...USER_PACK, id: "bundled.pack" };
    const fetchImpl = makeFetch({
      "modules/onomasticon/data-manifest.json": MANIFEST,
      "modules/onomasticon/packs/bundled.pack.json": BUNDLED_PACK,
      "modules/onomasticon/lexicons/test-given.json": GIVEN_LEXICON,
      "worlds/my-world/onomasticon-packs/user.pack.json": conflictingUserPack,
    });
    const browseImpl = vi.fn(async () => ({
      files: ["worlds/my-world/onomasticon-packs/user.pack.json"],
    }));

    const registry = await loadFullRegistry({
      baseUrl: "modules/onomasticon/",
      fetchImpl,
      browseImpl,
    });

    expect(registry.packs.size).toBe(1);
    expect(registry.packs.get("bundled.pack")).toEqual(BUNDLED_PACK);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/conflicts with an existing pack id/),
    );
  });

  it("re-merges on every call, so a pack added to the bundled registry after the first load is picked up", async () => {
    const fetchImpl = makeFetch({
      "modules/onomasticon/data-manifest.json": MANIFEST,
      "modules/onomasticon/packs/bundled.pack.json": BUNDLED_PACK,
      "modules/onomasticon/lexicons/test-given.json": GIVEN_LEXICON,
    });

    const first = await loadFullRegistry({ baseUrl: "modules/onomasticon/", fetchImpl });
    expect(first.packs.size).toBe(1);

    // Simulates api.registerPack (step 14) mutating the shared, cached bundled registry.
    (first.packs as Map<string, unknown>).set("runtime.pack", { ...USER_PACK, id: "runtime.pack" });

    const second = await loadFullRegistry({ baseUrl: "modules/onomasticon/", fetchImpl });
    expect(second.packs.has("runtime.pack")).toBe(true);
  });
});
