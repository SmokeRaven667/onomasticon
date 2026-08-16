import { describe, expect, it } from "vitest";
import { GroupContext } from "./GroupContext.js";

describe("GroupContext", () => {
  it("returns undefined for a group/key pair that was never set", () => {
    const ctx = new GroupContext();
    expect(ctx.get("kin-a", "family")).toBeUndefined();
  });

  it("getOrResolve computes and stores a value on first call", () => {
    const ctx = new GroupContext();
    let calls = 0;
    const value = ctx.getOrResolve("kin-a", "family", () => {
      calls++;
      return "Ostreth";
    });
    expect(value).toBe("Ostreth");
    expect(calls).toBe(1);
    expect(ctx.get("kin-a", "family")).toBe("Ostreth");
  });

  it("getOrResolve returns the cached value on later calls without invoking resolve again", () => {
    const ctx = new GroupContext();
    ctx.getOrResolve("kin-a", "family", () => "Ostreth");

    let calls = 0;
    const value = ctx.getOrResolve("kin-a", "family", () => {
      calls++;
      return "SomethingElse";
    });
    expect(value).toBe("Ostreth");
    expect(calls).toBe(0);
  });

  it("keeps different shareWithin keys independent within the same group", () => {
    const ctx = new GroupContext();
    ctx.getOrResolve("kin-a", "family", () => "Ostreth");
    ctx.getOrResolve("kin-a", "clan", () => "Ashwood");

    expect(ctx.get("kin-a", "family")).toBe("Ostreth");
    expect(ctx.get("kin-a", "clan")).toBe("Ashwood");
  });

  it("keeps different groups independent even under the same shareWithin key", () => {
    const ctx = new GroupContext();
    ctx.getOrResolve("kin-a", "family", () => "Ostreth");
    ctx.getOrResolve("kin-b", "family", () => "Vaelan");

    expect(ctx.get("kin-a", "family")).toBe("Ostreth");
    expect(ctx.get("kin-b", "family")).toBe("Vaelan");
  });

  it("clear discards a group's shared state so it can be resolved fresh again", () => {
    const ctx = new GroupContext();
    ctx.getOrResolve("kin-a", "family", () => "Ostreth");
    ctx.clear("kin-a");

    expect(ctx.get("kin-a", "family")).toBeUndefined();
    let calls = 0;
    const value = ctx.getOrResolve("kin-a", "family", () => {
      calls++;
      return "Vaelan";
    });
    expect(value).toBe("Vaelan");
    expect(calls).toBe(1);
  });
});
