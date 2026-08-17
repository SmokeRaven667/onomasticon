import { afterEach, describe, expect, it } from "vitest";
import {
  getCreatedActorsStub,
  resetActorStub,
  setActorDocumentTypesStub,
} from "../test/foundryStubs.js";
import type { Result } from "../types.js";
import { createRosterActors } from "./createRosterActors.js";

function fixtureResults(names: string[]): Result[] {
  return names.map((full) => ({
    full,
    parts: { full },
    meta: { packId: "test.pack", strategyId: "template", seed: 1 },
  }));
}

afterEach(() => {
  resetActorStub();
});

describe("createRosterActors", () => {
  it("creates one actor per result, named after the generated result", async () => {
    const created = await createRosterActors(fixtureResults(["Thalvir Stonebrook", "Isolwyn"]));

    expect(created).toHaveLength(2);
    expect(created.map((a) => a.name)).toEqual(["Thalvir Stonebrook", "Isolwyn"]);
    expect(getCreatedActorsStub()).toHaveLength(2);
  });

  it("uses whichever Actor type the active world registers first, not a hardcoded system-specific type", async () => {
    setActorDocumentTypesStub(["hireling", "npc"]);
    await createRosterActors(fixtureResults(["Vorel"]));

    expect(getCreatedActorsStub()[0]!.type).toBe("hireling");
  });

  it("throws when the world has no registered Actor type at all", async () => {
    setActorDocumentTypesStub([]);
    await expect(createRosterActors(fixtureResults(["X"]))).rejects.toThrow(
      /no Actor type is registered/,
    );
  });
});
