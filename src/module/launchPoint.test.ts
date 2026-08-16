import { describe, expect, it } from "vitest";
import { GeneratorApp } from "../apps/GeneratorApp.js";
import { openGenerator } from "./launchPoint.js";

describe("openGenerator", () => {
  it("returns the same GeneratorApp instance across calls", () => {
    const first = openGenerator();
    const second = openGenerator();
    expect(first).toBe(second);
    expect(first).toBeInstanceOf(GeneratorApp);
  });
});
