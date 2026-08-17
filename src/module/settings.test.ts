import { afterEach, describe, expect, it, vi } from "vitest";
import { resetSettingsStub } from "../test/foundryStubs.js";
import { MODULE_ID } from "./constants.js";
import { registerSettings, USER_PACK_PATH_SETTING } from "./settings.js";

afterEach(() => {
  resetSettingsStub();
});

describe("registerSettings", () => {
  it("registers exactly one 'init' hook", () => {
    const onceSpy = vi.spyOn(Hooks, "once");

    registerSettings();

    expect(onceSpy).toHaveBeenCalledOnce();
    expect(onceSpy).toHaveBeenCalledWith("init", expect.any(Function));

    onceSpy.mockRestore();
  });

  it("registers a world-scope, empty-by-default userPackPath setting once init fires", () => {
    const registerSpy = vi.spyOn(game.settings!, "register");

    registerSettings();
    Hooks.callAll("init");

    expect(registerSpy).toHaveBeenCalledWith(
      MODULE_ID,
      USER_PACK_PATH_SETTING,
      expect.objectContaining({ scope: "world", config: true, type: String, default: "" }),
    );
    expect(game.settings!.get(MODULE_ID, USER_PACK_PATH_SETTING)).toBe("");

    registerSpy.mockRestore();
  });
});
