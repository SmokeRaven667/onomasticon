import {
  buildPackFromForm,
  type FormatFormEntry,
  type SlotFormEntry,
} from "../authoring/buildPackFromForm.js";
import { savePack } from "../authoring/savePack.js";
import { loadFullRegistry } from "../browser/loadFullRegistry.js";
import type { ValidationError } from "../data/types.js";
import { validatePackData } from "../data/validatePack.js";
import { MODULE_ID } from "../module/constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface LexiconOption {
  id: string;
  selectedAttr: "selected" | "";
}

/**
 * `kind`'s three-way choice and the lexicon `<select>`'s current pick are both precomputed
 * here as `selected`/`""` attribute strings, the same way `GeneratorApp`'s own pack `<select>`
 * already does — not as a `{{#if}}` block straddling an attribute list, which Prettier's
 * Handlebars parser rejects ("A block may only be used inside an HTML element or another
 * block") even though Handlebars itself would happily render it.
 */
interface SlotViewEntry {
  name: string;
  variants?: string;
  pattern?: string;
  shareWithin?: string;
  optionalCheckedAttr: "checked" | "";
  lexiconKindSelectedAttr: "selected" | "";
  proceduralKindSelectedAttr: "selected" | "";
  derivedKindSelectedAttr: "selected" | "";
  lexiconOptions: LexiconOption[];
}

interface PackAuthorAppContext extends foundry.applications.api.ApplicationV2.RenderContext {
  id: string;
  label: string;
  description: string;
  author: string;
  packVersion: string;
  tags: string;
  slots: SlotViewEntry[];
  formats: FormatFormEntry[];
  derivationsJson: string;
  errors: ValidationError[];
  valid: boolean;
  saveDisabledAttr: "disabled" | "";
  saveMessage?: string;
}

const EMPTY_SLOT: SlotFormEntry = { name: "", kind: "lexicon" };
const EMPTY_FORMAT: FormatFormEntry = { pattern: "" };

/**
 * The v1 pack authoring form (step 24) — slots and formats only, per this codestep's own
 * open question, resolved in favor of the simpler option: derivations are still hand-edited
 * as raw JSON in a textarea, not built through per-field controls. Only the `template`
 * strategy is authorable here; a markov pack's config shape has nothing in common with
 * "slots, formats, derivations."
 */
export class PackAuthorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "onomasticon-pack-author",
    window: {
      title: "ONOMASTICON.PackAuthorApp.Title",
      icon: "fa-solid fa-pen-ruler",
      resizable: true,
    },
    position: { width: 640, height: "auto" as const },
    actions: {
      addSlot: PackAuthorApp.#onAddSlot,
      removeSlot: PackAuthorApp.#onRemoveSlot,
      addFormat: PackAuthorApp.#onAddFormat,
      removeFormat: PackAuthorApp.#onRemoveFormat,
      validate: PackAuthorApp.#onValidate,
      save: PackAuthorApp.#onSave,
    },
  };

  static override PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/pack-author.hbs` },
  };

  #id = "";
  #label = "";
  #description = "";
  #author = "";
  #packVersion = "";
  #tags = "";
  #slots: SlotFormEntry[] = [{ ...EMPTY_SLOT }];
  #formats: FormatFormEntry[] = [{ ...EMPTY_FORMAT }];
  #derivationsJson = "";
  #availableLexicons: string[] = [];
  #saveMessage: string | undefined;

  protected override async _prepareContext(): Promise<PackAuthorAppContext> {
    // Safe: only ever runs from render(), long after Foundry's "setup" hook has fired.
    const registry = await loadFullRegistry({ baseUrl: `modules/${MODULE_ID}/` });
    this.#availableLexicons = [...registry.lexicons.keys()].sort();

    const data = buildPackFromForm(this.#currentFormState());
    const result = validatePackData(data);

    return {
      id: this.#id,
      label: this.#label,
      description: this.#description,
      author: this.#author,
      packVersion: this.#packVersion,
      tags: this.#tags,
      slots: this.#slots.map((slot) => this.#slotView(slot)),
      formats: this.#formats,
      derivationsJson: this.#derivationsJson,
      errors: result.errors,
      valid: result.valid,
      saveDisabledAttr: result.valid ? "" : "disabled",
      saveMessage: this.#saveMessage,
    };
  }

  #slotView(slot: SlotFormEntry): SlotViewEntry {
    return {
      name: slot.name,
      variants: slot.variants,
      pattern: slot.pattern,
      shareWithin: slot.shareWithin,
      optionalCheckedAttr: slot.optional ? "checked" : "",
      lexiconKindSelectedAttr: slot.kind === "lexicon" ? "selected" : "",
      proceduralKindSelectedAttr: slot.kind === "procedural" ? "selected" : "",
      derivedKindSelectedAttr: slot.kind === "derived" ? "selected" : "",
      lexiconOptions: this.#availableLexicons.map((id) => ({
        id,
        selectedAttr: id === slot.lexicon ? "selected" : "",
      })),
    };
  }

  #currentFormState() {
    return {
      id: this.#id,
      label: this.#label,
      description: this.#description,
      author: this.#author,
      packVersion: this.#packVersion,
      tags: this.#tags,
      slots: this.#slots,
      formats: this.#formats,
      derivationsJson: this.#derivationsJson,
    };
  }

  /**
   * Reads every field currently in the DOM into instance state, before any action mutates
   * `#slots`/`#formats` and re-renders — same "capture before you mutate" lesson step 13's
   * kin-row UI already learned the hard way (see that codestep's history).
   */
  #captureFromDom(): void {
    const el = this.element;
    const value = (selector: string) => el.querySelector<HTMLInputElement>(selector)?.value ?? "";

    this.#id = value('input[name="id"]');
    this.#label = value('input[name="label"]');
    this.#description = value('textarea[name="description"]');
    this.#author = value('input[name="author"]');
    this.#packVersion = value('input[name="packVersion"]');
    this.#tags = value('input[name="tags"]');
    this.#derivationsJson = value('textarea[name="derivationsJson"]');

    const slotRows = [...el.querySelectorAll<HTMLElement>(".onomasticon-slot-row")];
    this.#slots = slotRows.map((row) => ({
      name: row.querySelector<HTMLInputElement>('[data-field="name"]')?.value ?? "",
      kind:
        (row.querySelector<HTMLSelectElement>('[data-field="kind"]')?.value as
          SlotFormEntry["kind"] | undefined) ?? "lexicon",
      lexicon: row.querySelector<HTMLSelectElement>('[data-field="lexicon"]')?.value,
      variants: row.querySelector<HTMLInputElement>('[data-field="variants"]')?.value,
      pattern: row.querySelector<HTMLInputElement>('[data-field="pattern"]')?.value,
      optional: row.querySelector<HTMLInputElement>('[data-field="optional"]')?.checked ?? false,
      shareWithin: row.querySelector<HTMLInputElement>('[data-field="shareWithin"]')?.value,
    }));

    const formatRows = [...el.querySelectorAll<HTMLElement>(".onomasticon-format-row")];
    this.#formats = formatRows.map((row) => {
      const weightValue = row.querySelector<HTMLInputElement>('[data-field="weight"]')?.value;
      return {
        pattern: row.querySelector<HTMLInputElement>('[data-field="pattern"]')?.value ?? "",
        weight: weightValue ? Number(weightValue) : undefined,
        requires: row.querySelector<HTMLInputElement>('[data-field="requires"]')?.value,
      };
    });
  }

  static async #onAddSlot(this: PackAuthorApp, _event: PointerEvent): Promise<void> {
    this.#captureFromDom();
    this.#slots.push({ ...EMPTY_SLOT });
    this.#saveMessage = undefined;
    await this.render();
  }

  static async #onRemoveSlot(
    this: PackAuthorApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    this.#captureFromDom();
    const index = Number(target.dataset.index);
    if (Number.isInteger(index) && index >= 0 && index < this.#slots.length) {
      this.#slots.splice(index, 1);
    }
    this.#saveMessage = undefined;
    await this.render();
  }

  static async #onAddFormat(this: PackAuthorApp, _event: PointerEvent): Promise<void> {
    this.#captureFromDom();
    this.#formats.push({ ...EMPTY_FORMAT });
    this.#saveMessage = undefined;
    await this.render();
  }

  static async #onRemoveFormat(
    this: PackAuthorApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    this.#captureFromDom();
    const index = Number(target.dataset.index);
    if (Number.isInteger(index) && index >= 0 && index < this.#formats.length) {
      this.#formats.splice(index, 1);
    }
    this.#saveMessage = undefined;
    await this.render();
  }

  static async #onValidate(this: PackAuthorApp, _event: PointerEvent): Promise<void> {
    this.#captureFromDom();
    this.#saveMessage = undefined;
    await this.render();
  }

  static async #onSave(this: PackAuthorApp, _event: PointerEvent): Promise<void> {
    this.#captureFromDom();

    try {
      const data = buildPackFromForm(this.#currentFormState());
      const { pack, path } = await savePack(data);
      // Safe: this handler only runs from a user click on an already-rendered dialog, long
      // after Foundry's "i18nInit" hook has fired.
      this.#saveMessage = game.i18n!.format("ONOMASTICON.PackAuthorApp.SavedNotification", {
        id: pack.id,
        path,
      });
      ui.notifications?.info(this.#saveMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ui.notifications?.error(
        game.i18n!.format("ONOMASTICON.GeneratorApp.ErrorNotification", { error: message }),
      );
    }

    await this.render();
  }
}
