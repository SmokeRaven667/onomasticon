import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBundledRegistryCache } from "../browser/loadBundledRegistry.js";
import { resetStrategyRegistry } from "../strategies/registry.js";
import { registerApi } from "./api.js";

const GIVEN_LEXICON = {
  schemaVersion: 1,
  id: "test-given",
  entries: [{ value: "Ashan" }],
};

const FAMILY_LEXICON = {
  schemaVersion: 1,
  id: "test-family",
  entries: [{ value: "Ostreth" }],
};

const PACK = {
  schemaVersion: 1,
  id: "test.pack",
  label: "Test Pack",
  tags: ["test"],
  strategy: "template",
  lexiconRefs: { given: "test-given", family: "test-family" },
  config: {
    slots: {
      given: { kind: "lexicon", lexicon: "given" },
      family: { kind: "lexicon", lexicon: "family" },
    },
    formats: [{ pattern: "{given} {family}" }],
  },
};

const MANIFEST = {
  packs: [{ id: "test.pack", file: "packs/test.pack.json" }],
  lexicons: [
    { id: "test-given", file: "lexicons/test-given.json" },
    { id: "test-family", file: "lexicons/test-family.json" },
  ],
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function stubFetch(routes: Record<string, unknown>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return url in routes ? jsonResponse(routes[url]) : jsonResponse(undefined, false, 404);
    }),
  );
}

beforeEach(() => {
  resetBundledRegistryCache();
  resetStrategyRegistry();
  stubFetch({
    "modules/onomasticon/data-manifest.json": MANIFEST,
    "modules/onomasticon/packs/test.pack.json": PACK,
    "modules/onomasticon/lexicons/test-given.json": GIVEN_LEXICON,
    "modules/onomasticon/lexicons/test-family.json": FAMILY_LEXICON,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetBundledRegistryCache();
  resetStrategyRegistry();
});

describe("registerApi", () => {
  it("assigns the full api surface on the onomasticon module once init fires", () => {
    registerApi();
    Hooks.callAll("init");

    const registeredModule = game.modules?.get("onomasticon") as unknown as
      { api?: Record<string, unknown> } | undefined;
    const api = registeredModule?.api;

    expect(typeof api?.openGenerator).toBe("function");
    expect(typeof api?.generate).toBe("function");
    expect(typeof api?.generateKin).toBe("function");
    expect(typeof api?.listPacks).toBe("function");
    expect(typeof api?.registerStrategy).toBe("function");
    expect(typeof api?.registerPack).toBe("function");
  });

  it("a throwaway second test module can call api.generate(...) and get back a valid Result", async () => {
    registerApi();
    Hooks.callAll("init");

    const api = (
      game.modules?.get("onomasticon") as unknown as { api: import("./api.js").OnomasticonApi }
    ).api;
    const result = await api.generate("test.pack", { seed: 1 });

    expect(typeof result.full).toBe("string");
    expect(result.full.length).toBeGreaterThan(0);
    expect(result.parts).toEqual({ given: "Ashan", family: "Ostreth" });
    expect(result.meta).toEqual({
      packId: "test.pack",
      strategyId: "template",
      seed: 1,
      groupId: undefined,
    });
  });

  it("api.generateKin(...) generates a flat kin group sharing a groupId", async () => {
    registerApi();
    Hooks.callAll("init");
    const api = (
      game.modules?.get("onomasticon") as unknown as { api: import("./api.js").OnomasticonApi }
    ).api;

    const results = await api.generateKin("test.pack", 3);
    expect(results).toHaveLength(3);
    expect(new Set(results.map((r) => r.meta.groupId)).size).toBe(1);
  });

  it("api.listPacks() summarizes the loaded registry", async () => {
    registerApi();
    Hooks.callAll("init");
    const api = (
      game.modules?.get("onomasticon") as unknown as { api: import("./api.js").OnomasticonApi }
    ).api;

    const packs = await api.listPacks();
    expect(packs).toEqual([
      { id: "test.pack", label: "Test Pack", description: undefined, tags: ["test"] },
    ]);
  });

  it("api.registerPack(...) validates and adds a pack, immediately generatable via api.generate", async () => {
    registerApi();
    Hooks.callAll("init");
    const api = (
      game.modules?.get("onomasticon") as unknown as { api: import("./api.js").OnomasticonApi }
    ).api;

    const customPack = {
      schemaVersion: 1,
      id: "test.custom",
      strategy: "template",
      lexiconRefs: { given: "test-given", family: "test-family" },
      config: {
        slots: {
          given: { kind: "lexicon", lexicon: "given" },
          family: { kind: "lexicon", lexicon: "family" },
        },
        formats: [{ pattern: "{given} {family}" }],
      },
    };

    const registered = await api.registerPack(customPack);
    expect(registered.id).toBe("test.custom");

    const result = await api.generate("test.custom", { seed: 1 });
    expect(result.parts).toEqual({ given: "Ashan", family: "Ostreth" });
  });

  it("api.registerPack(...) rejects invalid pack data instead of silently accepting it", async () => {
    registerApi();
    Hooks.callAll("init");
    const api = (
      game.modules?.get("onomasticon") as unknown as { api: import("./api.js").OnomasticonApi }
    ).api;

    await expect(api.registerPack({ schemaVersion: 1 })).rejects.toThrow(/invalid pack data/);
  });

  it("api.registerPack(...) rejects an id collision rather than silently overriding", async () => {
    registerApi();
    Hooks.callAll("init");
    const api = (
      game.modules?.get("onomasticon") as unknown as { api: import("./api.js").OnomasticonApi }
    ).api;

    await expect(api.registerPack(PACK)).rejects.toThrow(/already registered/);
  });

  it("api.registerStrategy(...) makes a custom-strategy pack generatable via api.generate, proving the seam", async () => {
    registerApi();
    Hooks.callAll("init");
    const api = (
      game.modules?.get("onomasticon") as unknown as { api: import("./api.js").OnomasticonApi }
    ).api;

    api.registerStrategy("noop-test", () => ({
      full: "Test Testerson",
      parts: { given: "Test", family: "Testerson" },
    }));
    await api.registerPack({ schemaVersion: 1, id: "test.noop", strategy: "noop-test" });

    const result = await api.generate("test.noop");
    expect(result.full).toBe("Test Testerson");
    expect(result.meta.strategyId).toBe("noop-test");
  });
});
