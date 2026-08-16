type HookFn = (...args: unknown[]) => unknown;

/**
 * Minimal, real (not mocked-away) implementation of the pieces of Foundry's global `Hooks`
 * API that test code touches — just enough that importing module code with hook-registration
 * side effects doesn't crash under plain Node. Individual tests can still `vi.spyOn` its
 * methods for behavioral assertions. Expand only as later steps actually need more of it.
 */
class HooksStub {
  private handlers = new Map<string, HookFn[]>();

  on(hook: string, fn: HookFn): void {
    const list = this.handlers.get(hook) ?? [];
    list.push(fn);
    this.handlers.set(hook, list);
  }

  once(hook: string, fn: HookFn): void {
    const wrapped: HookFn = (...args) => {
      this.off(hook, wrapped);
      return fn(...args);
    };
    this.on(hook, wrapped);
  }

  off(hook: string, fn: HookFn): void {
    const list = this.handlers.get(hook);
    if (!list) return;
    this.handlers.set(
      hook,
      list.filter((registered) => registered !== fn),
    );
  }

  callAll(hook: string, ...args: unknown[]): void {
    for (const fn of [...(this.handlers.get(hook) ?? [])]) fn(...args);
  }

  /** Unlike callAll, stops (and returns false) at the first listener that returns false. */
  call(hook: string, ...args: unknown[]): boolean {
    for (const fn of [...(this.handlers.get(hook) ?? [])]) {
      if (fn(...args) === false) return false;
    }
    return true;
  }
}

// @ts-expect-error - fvtt-types declares Hooks as an ambient `const`, not a globalThis property.
globalThis.Hooks = new HooksStub() as unknown as typeof Hooks;

/**
 * Minimal stand-ins for `foundry.applications.api.{ApplicationV2,HandlebarsApplicationMixin}` —
 * just enough that `class Foo extends HandlebarsApplicationMixin(ApplicationV2) {}` can be
 * defined (and imported) without crashing. Real rendering behavior isn't emulated; UI classes
 * built on these are verified manually in an actual Foundry instance, not unit-tested here.
 */
class ApplicationV2Stub {
  static DEFAULT_OPTIONS: Record<string, unknown> = {};
  static PARTS: Record<string, unknown> = {};

  render(..._args: unknown[]): this {
    return this;
  }
}

function handlebarsApplicationMixinStub<T extends new (...args: unknown[]) => object>(Base: T): T {
  return Base;
}

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: ApplicationV2Stub,
      HandlebarsApplicationMixin: handlebarsApplicationMixinStub,
    },
  },
} as unknown as typeof foundry;

interface ModuleStub {
  id: string;
  api?: unknown;
}

const modules = new Map<string, ModuleStub>([["onomasticon", { id: "onomasticon" }]]);

/**
 * Real (not mocked) `register`/`get`/`set`, keyed the same way Foundry itself does
 * ("namespace.key") — `register` seeds the default so `get` behaves correctly for a
 * setting nothing has explicitly `set` yet, same as real Foundry.
 */
const settingsStore = new Map<string, unknown>();
const settings = {
  register: (namespace: string, key: string, data: { default?: unknown }): void => {
    settingsStore.set(`${namespace}.${key}`, data.default);
  },
  get: (namespace: string, key: string): unknown => settingsStore.get(`${namespace}.${key}`),
  set: (namespace: string, key: string, value: unknown): Promise<unknown> => {
    settingsStore.set(`${namespace}.${key}`, value);
    return Promise.resolve(value);
  },
};

/** Test-only escape hatch: clears every registered/set setting value. */
export function resetSettingsStub(): void {
  settingsStore.clear();
}

/**
 * Real (not mocked) `localize`/`format` — returns the key/template unresolved (no `lang/en.json`
 * loaded under plain Node), which is enough for tests that only assert a notification/button
 * fired, not its exact rendered text. `format` does a naive `{placeholder}` substitution so call
 * sites can still be tested against a known output if needed.
 */
const i18n = {
  localize: (key: string): string => key,
  format: (key: string, data: Record<string, unknown> = {}): string =>
    key.replace(/\{(\w+)\}/g, (match, token: string) =>
      token in data ? String(data[token]) : match,
    ),
};

// @ts-expect-error - fvtt-types declares `game` as an ambient `const`, not a globalThis property.
globalThis.game = {
  modules,
  clipboard: { copyPlainText: async (_text: string) => {} },
  i18n,
  settings,
};

// @ts-expect-error - fvtt-types declares `ui` as an ambient `const`, not a globalThis property.
globalThis.ui = {
  notifications: { info: () => {}, warn: () => {}, error: () => {} },
};
