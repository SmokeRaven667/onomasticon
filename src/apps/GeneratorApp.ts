import { generateKinWithRegistry } from "../generateKinWithRegistry.js";
import { generateWithRegistry } from "../generateWithRegistry.js";
import { loadFullRegistry } from "../browser/loadFullRegistry.js";
import { MODULE_ID } from "../module/constants.js";
import type { Registry } from "../data/types.js";
import type { Result } from "../types.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface PackOption {
  id: string;
  label: string;
  selectedAttr: "selected" | "";
}

interface PackGroup {
  tag: string;
  packs: PackOption[];
}

interface ResultEntry {
  index: number;
  full: string;
}

interface KinRow {
  index: number;
  variant: string;
}

interface GeneratorAppContext extends foundry.applications.api.ApplicationV2.RenderContext {
  packGroups: PackGroup[];
  variant: string;
  results: ResultEntry[];
  error?: string;
  kinCount: number;
  kinRows: KinRow[];
  showClearAll: boolean;
}

export class GeneratorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "onomasticon-generator",
    window: {
      title: "ONOMASTICON.GeneratorApp.Title",
      icon: "fa-solid fa-signature",
      resizable: true,
    },
    position: { width: 480, height: "auto" as const },
    actions: {
      generate: GeneratorApp.#onGenerate,
      copy: GeneratorApp.#onCopy,
      deleteResult: GeneratorApp.#onDeleteResult,
      clearResults: GeneratorApp.#onClearResults,
      setKinRows: GeneratorApp.#onSetKinRows,
      generateKin: GeneratorApp.#onGenerateKin,
    },
  };

  static override PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/generator.hbs` },
  };

  #registry: Registry | undefined;
  #results: Result[] = [];
  #error: string | undefined;
  #selectedPackId: string | undefined;
  #variant = "";
  #kinCount = 1;
  /** One entry per kin-row variant input, in row order — "ask variant per row before generating". */
  #kinVariants: string[] = [""];

  protected override async _prepareContext(): Promise<GeneratorAppContext> {
    try {
      this.#registry ??= await loadFullRegistry({ baseUrl: `modules/${MODULE_ID}/` });
      this.#error = undefined;
    } catch (error) {
      this.#error = error instanceof Error ? error.message : String(error);
      return {
        packGroups: [],
        variant: this.#variant,
        results: this.#resultEntries(),
        error: this.#error,
        kinCount: this.#kinCount,
        kinRows: this.#kinRows(),
        showClearAll: this.#results.length >= 3,
      };
    }

    const groups = new Map<string, PackOption[]>();
    for (const pack of this.#registry.packs.values()) {
      const tag = pack.tags?.[0] ?? "other";
      const options = groups.get(tag) ?? [];
      options.push({
        id: pack.id,
        label: pack.label ?? pack.id,
        selectedAttr: pack.id === this.#selectedPackId ? "selected" : "",
      });
      groups.set(tag, options);
    }

    return {
      packGroups: [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, packs]) => ({ tag, packs })),
      variant: this.#variant,
      results: this.#resultEntries(),
      kinCount: this.#kinCount,
      kinRows: this.#kinRows(),
      showClearAll: this.#results.length >= 3,
    };
  }

  #kinRows(): KinRow[] {
    return this.#kinVariants.map((variant, i) => ({ index: i + 1, variant }));
  }

  /**
   * Kin rows are only meaningful relative to whichever pack is selected (a variant typed
   * for one pack, e.g. "neutral", may not exist on another) — switching packs resets the
   * family back to one empty row rather than carrying stale rows over. The pack `<select>`
   * has no `data-action`, so this listener is (re)attached here instead, since the whole
   * body (including the `<select>` itself) is replaced on every render.
   */
  protected override async _onRender(): Promise<void> {
    const packSelect = this.element.querySelector<HTMLSelectElement>('select[name="packId"]');
    packSelect?.addEventListener("change", () => {
      this.#selectedPackId = packSelect.value;
      this.#kinCount = 1;
      this.#kinVariants = [""];
      void this.render();
    });
  }

  /**
   * 1-based, newest-first (matching insertion order) so two people looking at the same
   * rendered list can point at "#3" and mean the same result. Computed here rather than
   * relying on the browser's native `<ol>` counter, since Foundry's own base styles reset
   * `list-style` on lists inside its window chrome with higher CSS specificity than a
   * module stylesheet can cleanly override.
   */
  #resultEntries(): ResultEntry[] {
    return this.#results.map((result, i) => ({ index: i + 1, full: result.full }));
  }

  static async #onGenerate(this: GeneratorApp, _event: PointerEvent): Promise<void> {
    if (!this.#registry) return;

    const packSelect = this.element.querySelector<HTMLSelectElement>('select[name="packId"]');
    const variantInput = this.element.querySelector<HTMLInputElement>('input[name="variant"]');

    const packId = packSelect?.value;
    if (!packId) return;
    const variant = variantInput?.value.trim() || undefined;

    this.#selectedPackId = packId;
    this.#variant = variantInput?.value ?? "";

    try {
      const result = generateWithRegistry(packId, { variant }, this.#registry);
      this.#results.unshift(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Safe: this handler only runs from a user click on an already-rendered dialog, long
      // after Foundry's "i18nInit" hook has fired.
      ui.notifications?.error(
        game.i18n!.format("ONOMASTICON.GeneratorApp.ErrorNotification", { error: message }),
      );
    }

    await this.render();
  }

  static async #onCopy(
    this: GeneratorApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const full = target.dataset.full;
    if (!full) return;
    await game.clipboard?.copyPlainText(full);
    // Safe: this handler only runs from a user click on an already-rendered dialog, long after
    // Foundry's "i18nInit" hook has fired.
    ui.notifications?.info(
      game.i18n!.format("ONOMASTICON.GeneratorApp.CopyNotification", { name: full }),
    );
  }

  /** `data-index` is the same 1-based, newest-first index #resultEntries() renders it with. */
  static async #onDeleteResult(
    this: GeneratorApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const index = Number(target.dataset.index);
    if (!Number.isInteger(index) || index < 1 || index > this.#results.length) return;
    this.#results.splice(index - 1, 1);
    await this.render();
  }

  static async #onClearResults(this: GeneratorApp, _event: PointerEvent): Promise<void> {
    this.#results = [];
    await this.render();
  }

  /**
   * Resizes the kin-row variant inputs to the requested count, preserving already-typed rows.
   * Also re-captures the pack `<select>` and standalone `variant` input, same as #onGenerate —
   * without this, re-rendering drops both back to their defaults (see step 08's history).
   */
  static async #onSetKinRows(this: GeneratorApp, _event: PointerEvent): Promise<void> {
    const packSelect = this.element.querySelector<HTMLSelectElement>('select[name="packId"]');
    const variantInput = this.element.querySelector<HTMLInputElement>('input[name="variant"]');
    const countInput = this.element.querySelector<HTMLInputElement>('input[name="kinCount"]');
    const count = Math.max(1, Math.trunc(Number(countInput?.value)) || 1);

    const typedVariants = [
      ...this.element.querySelectorAll<HTMLInputElement>(".onomasticon-kin-variant"),
    ].map((input) => input.value);

    if (packSelect?.value) this.#selectedPackId = packSelect.value;
    this.#variant = variantInput?.value ?? this.#variant;
    this.#kinCount = count;
    this.#kinVariants = Array.from({ length: count }, (_, i) => typedVariants[i] ?? "");

    await this.render();
  }

  static async #onGenerateKin(this: GeneratorApp, _event: PointerEvent): Promise<void> {
    if (!this.#registry) return;

    const packSelect = this.element.querySelector<HTMLSelectElement>('select[name="packId"]');
    const variantInput = this.element.querySelector<HTMLInputElement>('input[name="variant"]');
    const packId = packSelect?.value;
    if (!packId) return;

    this.#selectedPackId = packId;
    this.#variant = variantInput?.value ?? this.#variant;
    this.#kinVariants = [
      ...this.element.querySelectorAll<HTMLInputElement>(".onomasticon-kin-variant"),
    ].map((input) => input.value);

    try {
      const results = generateKinWithRegistry(
        packId,
        this.#kinCount,
        { members: this.#kinVariants.map((variant) => ({ variant: variant.trim() || undefined })) },
        this.#registry,
      );
      this.#results.unshift(...results);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Safe: this handler only runs from a user click on an already-rendered dialog, long
      // after Foundry's "i18nInit" hook has fired.
      ui.notifications?.error(
        game.i18n!.format("ONOMASTICON.GeneratorApp.ErrorNotification", { error: message }),
      );
    }

    await this.render();
  }
}
