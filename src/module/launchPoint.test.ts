import { describe, expect, it } from "vitest";
import { GeneratorApp } from "../apps/GeneratorApp.js";
import { openGenerator, registerLaunchPoint } from "./launchPoint.js";

describe("openGenerator", () => {
  it("returns the same GeneratorApp instance across calls", () => {
    const first = openGenerator();
    const second = openGenerator();
    expect(first).toBe(second);
    expect(first).toBeInstanceOf(GeneratorApp);
  });
});

describe("registerLaunchPoint", () => {
  it("exposes api.openGenerator on the onomasticon module once init fires", () => {
    registerLaunchPoint();
    Hooks.callAll("init");

    const registeredModule = game.modules?.get("onomasticon") as unknown as
      { api?: { openGenerator?: unknown } } | undefined;
    const api = registeredModule?.api;
    expect(typeof api?.openGenerator).toBe("function");
  });
});
