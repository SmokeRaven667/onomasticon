import { afterEach, describe, expect, it, vi } from "vitest";
import { setSystemIdStub } from "../test/foundryStubs.js";
import type { Result } from "../types.js";
import {
  applyToActor,
  registerSystemAdapterForTest,
  resetSystemAdaptersForTest,
} from "./actorAdapter.js";

function fixtureResult(full: string): Result {
  return { full, parts: { full }, meta: { packId: "test.pack", strategyId: "template", seed: 1 } };
}

function fakeActor(): { update: ReturnType<typeof vi.fn> } {
  return { update: vi.fn().mockResolvedValue(undefined) };
}

afterEach(() => {
  setSystemIdStub("");
  resetSystemAdaptersForTest();
});

describe("applyToActor", () => {
  it("falls back to actor.update({ name }) when no system adapter is registered", async () => {
    setSystemIdStub("");
    const actor = fakeActor();
    await applyToActor(actor as never, fixtureResult("Thalvir Stonebrook"));
    expect(actor.update).toHaveBeenCalledWith({ name: "Thalvir Stonebrook" });
  });

  it("falls back to the generic adapter for a system with no registered override (e.g. dnd5e)", async () => {
    setSystemIdStub("dnd5e");
    const actor = fakeActor();
    await applyToActor(actor as never, fixtureResult("Caelith"));
    expect(actor.update).toHaveBeenCalledWith({ name: "Caelith" });
  });

  it("prefers a registered system-specific adapter over the generic fallback", async () => {
    setSystemIdStub("test-system");
    const systemAdapter = vi.fn().mockResolvedValue(undefined);
    registerSystemAdapterForTest("test-system", systemAdapter);

    const actor = fakeActor();
    const result = fixtureResult("Isolwyn");
    await applyToActor(actor as never, result);

    expect(systemAdapter).toHaveBeenCalledWith(actor, result);
    expect(actor.update).not.toHaveBeenCalled();
  });

  it("doesn't use a system adapter registered under a different system id", async () => {
    setSystemIdStub("dnd5e");
    const otherSystemAdapter = vi.fn().mockResolvedValue(undefined);
    registerSystemAdapterForTest("pf2e", otherSystemAdapter);

    const actor = fakeActor();
    await applyToActor(actor as never, fixtureResult("Vorel"));

    expect(otherSystemAdapter).not.toHaveBeenCalled();
    expect(actor.update).toHaveBeenCalledWith({ name: "Vorel" });
  });
});
