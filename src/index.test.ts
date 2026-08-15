import { describe, expect, it } from "vitest";
import { ONOMASTICON_VERSION } from "./index.js";

describe("build pipeline", () => {
  it("exposes a version string", () => {
    expect(ONOMASTICON_VERSION).toBe("0.0.1");
  });
});
