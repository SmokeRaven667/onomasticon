import { GeneratorApp } from "../apps/GeneratorApp.js";
import { PackAuthorApp } from "../apps/PackAuthorApp.js";

let appInstance: GeneratorApp | undefined;
let authorAppInstance: PackAuthorApp | undefined;

/** Also exposed as `game.modules.get("onomasticon").api.openGenerator()` — see module/api.ts. */
export function openGenerator(): GeneratorApp {
  appInstance ??= new GeneratorApp();
  void appInstance.render(true);
  return appInstance;
}

/**
 * Opens the pack authoring form (step 24) — reached from a button inside the generator
 * dialog itself, not a second Journal Directory header button. Also exposed as
 * `game.modules.get("onomasticon").api.openPackAuthor()`, same as `openGenerator`.
 */
export function openPackAuthor(): PackAuthorApp {
  authorAppInstance ??= new PackAuthorApp();
  void authorAppInstance.render(true);
  return authorAppInstance;
}

/**
 * Wires up Journal Directory header buttons (the default launch point per codestep 08 —
 * revisit if it doesn't feel right in practice) as one way to reach the generator dialog and
 * (step 24) the pack authoring form. The other way for each — `game.modules.get("onomasticon")
 * .api.openGenerator()`/`.openPackAuthor()` for macros — is assigned in module/api.ts's own
 * `init` hook, not here, so there's a single writer of `module.api`.
 */
export function registerLaunchPoint(): void {
  Hooks.on("renderJournalDirectory", (_app: unknown, html: HTMLElement) => {
    const container =
      html.querySelector(".header-actions") ?? html.querySelector(".directory-header");
    if (!container) return;

    const generatorButton = document.createElement("button");
    generatorButton.type = "button";
    generatorButton.classList.add("onomasticon-open-generator");
    // Safe: renderJournalDirectory fires long after Foundry's "i18nInit" hook.
    generatorButton.innerHTML = `<i class="fa-solid fa-signature"></i> ${game.i18n!.localize("ONOMASTICON.LaunchButton")}`;
    generatorButton.addEventListener("click", () => openGenerator());

    const authorButton = document.createElement("button");
    authorButton.type = "button";
    authorButton.classList.add("onomasticon-open-pack-author");
    authorButton.innerHTML = `<i class="fa-solid fa-pen-ruler"></i> ${game.i18n!.localize("ONOMASTICON.AuthorLaunchButton")}`;
    authorButton.addEventListener("click", () => openPackAuthor());

    container.append(generatorButton, authorButton);
  });
}
