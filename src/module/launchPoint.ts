import { GeneratorApp } from "../apps/GeneratorApp.js";
import { MODULE_ID } from "./constants.js";

let appInstance: GeneratorApp | undefined;

export function openGenerator(): GeneratorApp {
  appInstance ??= new GeneratorApp();
  void appInstance.render(true);
  return appInstance;
}

/**
 * Wires up the two ways to reach the generator dialog: a Journal Directory header button
 * (the default launch point per codestep 08 — revisit if it doesn't feel right in practice)
 * and a minimal `game.modules.get("onomasticon").api.openGenerator()` for macros. This `api`
 * is a stepping stone; step 14 formalizes the real public API surface.
 */
export function registerLaunchPoint(): void {
  Hooks.on("renderJournalDirectory", (_app: unknown, html: HTMLElement) => {
    const container =
      html.querySelector(".header-actions") ?? html.querySelector(".directory-header");
    if (!container) return;

    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("onomasticon-open-generator");
    button.innerHTML = '<i class="fa-solid fa-signature"></i> Onomasticon';
    button.addEventListener("click", () => openGenerator());

    container.append(button);
  });

  Hooks.once("init", () => {
    const module = game.modules?.get(MODULE_ID);
    if (module) {
      (module as unknown as { api?: unknown }).api = { openGenerator };
    }
  });
}
