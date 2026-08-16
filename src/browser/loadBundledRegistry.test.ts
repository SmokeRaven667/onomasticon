import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBundledRegistry, resetBundledRegistryCache } from "./loadBundledRegistry.js";

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
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

function makeFetch(routes: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!(url in routes)) return jsonResponse(undefined, false, 404);
    return jsonResponse(routes[url]);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  resetBundledRegistryCache();
});

describe("loadBundledRegistry", () => {
  it("fetches the manifest, then every pack and lexicon it lists", async () => {
    const fetchImpl = makeFetch({
      "modules/onomasticon/data-manifest.json": MANIFEST,
      "modules/onomasticon/packs/test.pack.json": PACK,
      "modules/onomasticon/lexicons/test-given.json": GIVEN_LEXICON,
      "modules/onomasticon/lexicons/test-family.json": FAMILY_LEXICON,
    });

    const registry = await loadBundledRegistry({ baseUrl: "modules/onomasticon/", fetchImpl });

    expect(registry.packs.get("test.pack")?.id).toBe("test.pack");
    expect(registry.lexicons.get("test-given")?.entries[0]?.value).toBe("Ashan");
    expect(registry.lexicons.get("test-family")?.entries[0]?.value).toBe("Ostreth");
  });

  it("normalizes a baseUrl with no trailing slash", async () => {
    const fetchImpl = makeFetch({
      "modules/onomasticon/data-manifest.json": { packs: [], lexicons: [] },
    });

    const registry = await loadBundledRegistry({ baseUrl: "modules/onomasticon", fetchImpl });
    expect(registry.packs.size).toBe(0);
  });

  it("throws with the url and status when a fetch fails", async () => {
    const fetchImpl = makeFetch({});
    await expect(
      loadBundledRegistry({ baseUrl: "modules/onomasticon/", fetchImpl }),
    ).rejects.toThrow(/data-manifest\.json.*404/);
  });

  it("throws with details when a fetched pack fails validation", async () => {
    const fetchImpl = makeFetch({
      "modules/onomasticon/data-manifest.json": {
        packs: [{ id: "bad", file: "packs/bad.json" }],
        lexicons: [],
      },
      "modules/onomasticon/packs/bad.json": { schemaVersion: 1, id: "bad" },
    });

    await expect(
      loadBundledRegistry({ baseUrl: "modules/onomasticon/", fetchImpl }),
    ).rejects.toThrow(/bad\.json/);
  });

  it("caches across calls and does not re-fetch", async () => {
    const fetchImpl = makeFetch({
      "modules/onomasticon/data-manifest.json": { packs: [], lexicons: [] },
    });

    await loadBundledRegistry({ baseUrl: "modules/onomasticon/", fetchImpl });
    await loadBundledRegistry({ baseUrl: "modules/onomasticon/", fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("clears the cache on failure so a later call retries", async () => {
    let attempt = 0;
    const fetchImpl = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) return jsonResponse(undefined, false, 500);
      return jsonResponse({ packs: [], lexicons: [] });
    }) as unknown as typeof fetch;

    await expect(
      loadBundledRegistry({ baseUrl: "modules/onomasticon/", fetchImpl }),
    ).rejects.toThrow();

    const registry = await loadBundledRegistry({ baseUrl: "modules/onomasticon/", fetchImpl });
    expect(registry.packs.size).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
