import { describe, expect, it, vi } from "vitest";
import { registerInitHook } from "./init.js";

describe("registerInitHook", () => {
  it("registers exactly one 'init' hook", () => {
    const onceSpy = vi.spyOn(Hooks, "once");

    registerInitHook();

    expect(onceSpy).toHaveBeenCalledOnce();
    expect(onceSpy).toHaveBeenCalledWith("init", expect.any(Function));

    onceSpy.mockRestore();
  });
});
