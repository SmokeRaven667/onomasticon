import { describe, expect, it, vi } from "vitest";
import { loadUserPacks, resetUserPacksCache } from "./loadUserPacks.js";

const VALID_PACK = {
  schemaVersion: 1,
  id: "user.pack",
  strategy: "template",
  lexiconRefs: { given: "test-given" },
  config: {
    slots: { given: { kind: "lexicon", lexicon: "given" } },
    formats: [{ pattern: "{given}" }],
  },
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

describe("loadUserPacks", () => {
  it("returns no packs and no warnings when path is empty", async () => {
    const result = await loadUserPacks({ path: "" });
    expect(result).toEqual({ packs: [], warnings: [] });
  });

  it("browses the directory, fetches, and validates every .json file it finds", async () => {
    resetUserPacksCache();
    const browseImpl = vi.fn(async () => ({
      files: ["packs/user.pack.json", "packs/readme.txt"],
    }));
    const fetchImpl = makeFetch({ "packs/user.pack.json": VALID_PACK });

    const result = await loadUserPacks({ path: "packs", browseImpl, fetchImpl });

    expect(browseImpl).toHaveBeenCalledWith("data", "packs");
    expect(fetchImpl).toHaveBeenCalledTimes(1); // readme.txt is filtered out, never fetched
    expect(result.warnings).toEqual([]);
    expect(result.packs).toHaveLength(1);
    expect(result.packs[0]?.id).toBe("user.pack");
  });

  it("warns and skips (rather than throwing) when the directory can't be browsed", async () => {
    resetUserPacksCache();
    const browseImpl = vi.fn(async () => {
      throw new Error("permission denied");
    });

    const result = await loadUserPacks({ path: "no-such-dir", browseImpl });

    expect(result.packs).toEqual([]);
    expect(result.warnings).toEqual([
      'could not browse user pack directory "no-such-dir": permission denied',
    ]);
  });

  it("warns and skips a file that fails to fetch, without affecting other files", async () => {
    resetUserPacksCache();
    const browseImpl = vi.fn(async () => ({
      files: ["packs/missing.json", "packs/user.pack.json"],
    }));
    const fetchImpl = makeFetch({ "packs/user.pack.json": VALID_PACK });

    const result = await loadUserPacks({ path: "packs", browseImpl, fetchImpl });

    expect(result.packs).toHaveLength(1);
    expect(result.packs[0]?.id).toBe("user.pack");
    expect(result.warnings).toEqual(['"packs/missing.json" failed to fetch (404)']);
  });

  it("warns and skips a file that fails validation", async () => {
    resetUserPacksCache();
    const browseImpl = vi.fn(async () => ({ files: ["packs/bad.json"] }));
    const fetchImpl = makeFetch({ "packs/bad.json": { schemaVersion: 1 } });

    const result = await loadUserPacks({ path: "packs", browseImpl, fetchImpl });

    expect(result.packs).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/"packs\/bad\.json" is invalid/);
  });

  it("warns and skips a duplicate id within the same directory, keeping the first", async () => {
    resetUserPacksCache();
    const duplicate = { ...VALID_PACK, id: "user.pack" };
    const browseImpl = vi.fn(async () => ({
      files: ["packs/a.json", "packs/b.json"],
    }));
    const fetchImpl = makeFetch({
      "packs/a.json": VALID_PACK,
      "packs/b.json": duplicate,
    });

    const result = await loadUserPacks({ path: "packs", browseImpl, fetchImpl });

    expect(result.packs).toHaveLength(1);
    expect(result.warnings).toEqual([
      '"packs/b.json" uses id "user.pack", already used by "packs/a.json" in this directory — skipped',
    ]);
  });

  it("caches per path so a second call with the same path doesn't re-browse", async () => {
    resetUserPacksCache();
    const browseImpl = vi.fn(async () => ({ files: [] }));

    await loadUserPacks({ path: "packs", browseImpl });
    await loadUserPacks({ path: "packs", browseImpl });

    expect(browseImpl).toHaveBeenCalledTimes(1);
  });

  it("a different path is a different cache key - no explicit reset needed", async () => {
    resetUserPacksCache();
    const browseImpl = vi.fn(async () => ({ files: [] }));

    await loadUserPacks({ path: "packs-a", browseImpl });
    await loadUserPacks({ path: "packs-b", browseImpl });

    expect(browseImpl).toHaveBeenCalledTimes(2);
  });
});
