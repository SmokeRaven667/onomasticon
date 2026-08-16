import { GeneratorApp } from "../apps/GeneratorApp.js";

let appInstance: GeneratorApp | undefined;

/** Also exposed as `game.modules.get("onomasticon").api.openGenerator()` — see module/api.ts. */
export function openGenerator(): GeneratorApp {
  appInstance ??= new GeneratorApp();
  void appInstance.render(true);
  return appInstance;
}

/**
 * Wires up a Journal Directory header button (the default launch point per codestep 08 —
 * revisit if it doesn't feel right in practice) as one way to reach the generator dialog.
 * The other way — `game.modules.get("onomasticon").api.openGenerator()` for macros — is
 * assigned in module/api.ts's own `init` hook, not here, so there's a single writer of
 * `module.api`.
 */
export function registerLaunchPoint(): void {
  Hooks.on("renderJournalDirectory", (_app: unknown, html: HTMLElement) => {
    const container =
      html.querySelector(".header-actions") ?? html.querySelector(".directory-header");
    if (!container) return;

    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("onomasticon-open-generator");
    // Safe: renderJournalDirectory fires long after Foundry's "i18nInit" hook.
    button.innerHTML = `<i class="fa-solid fa-signature"></i> ${game.i18n!.localize("ONOMASTICON.LaunchButton")}`;
    button.addEventListener("click", () => openGenerator());

    container.append(button);
  });
}
