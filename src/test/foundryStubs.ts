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

const system = { id: "" };

/** Test-only escape hatch: sets `game.system.id`, e.g. to test a system-specific actor adapter. */
export function setSystemIdStub(id: string): void {
  system.id = id;
}

interface JournalEntryPageStub {
  id: string;
  name: string;
  type: string;
  text?: { content: string; format: number };
}

let journalIdCounter = 0;
let pageIdCounter = 0;
const journalStore = new Map<string, JournalEntryStub>();

/**
 * Real (not mocked) in-memory `JournalEntry` stand-in — just enough of Foundry's document API
 * (`create`, `createEmbeddedDocuments`) for src/journal/sendToJournal.ts to be tested without
 * a live Foundry world. `pages` is a real `Map` (not an array) so it structurally matches
 * enough of the real `EmbeddedCollection` (`.size`, `.get`, `.values()`) for test code typed
 * against the real `JournalEntry.Implementation` interface to work against this stub. Ids are
 * assigned in creation order, not random, so tests can assert against a known id.
 */
class JournalEntryStub {
  #id: string;
  name: string;
  pages: Map<string, JournalEntryPageStub>;

  constructor(id: string, name: string, pages: Map<string, JournalEntryPageStub>) {
    this.#id = id;
    this.name = name;
    this.pages = pages;
  }

  get id(): string {
    return this.#id;
  }

  async createEmbeddedDocuments(
    _type: "JournalEntryPage",
    data: Array<Omit<JournalEntryPageStub, "id">>,
  ): Promise<JournalEntryPageStub[]> {
    const created = data.map((page) => ({ ...page, id: `page-${++pageIdCounter}` }));
    for (const page of created) this.pages.set(page.id, page);
    return created;
  }

  static async create(data: {
    name: string;
    pages?: Array<Omit<JournalEntryPageStub, "id">>;
  }): Promise<JournalEntryStub> {
    const entry = new JournalEntryStub(`journal-${++journalIdCounter}`, data.name, new Map());
    if (data.pages) await entry.createEmbeddedDocuments("JournalEntryPage", data.pages);
    journalStore.set(entry.id, entry);
    return entry;
  }
}

const journal = {
  get: (id: string): JournalEntryStub | undefined => journalStore.get(id),
  get contents(): JournalEntryStub[] {
    return [...journalStore.values()];
  },
};

/** Test-only escape hatch: clears every stubbed journal entry. */
export function resetJournalStub(): void {
  journalStore.clear();
  journalIdCounter = 0;
  pageIdCounter = 0;
}

interface ChatMessageCreateDataStub {
  content: string;
  speaker?: unknown;
  whisper?: string[];
}

const createdChatMessages: ChatMessageCreateDataStub[] = [];

/**
 * Real (not mocked) `ChatMessage` stand-in — records every `create()` call so
 * src/module/chatCommand.ts's tests can assert on posted content/whisper targets without a
 * live Foundry world. `getWhisperRecipients` returns a fixed fake GM user, same "just enough
 * to exercise the call site" scope as the other stubs in this file.
 */
const ChatMessageStub = {
  create: async (data: ChatMessageCreateDataStub): Promise<ChatMessageCreateDataStub> => {
    createdChatMessages.push(data);
    return data;
  },
  getSpeaker: (): { alias: string } => ({ alias: "Test Speaker" }),
  getWhisperRecipients: (_name: string): Array<{ id: string }> => [{ id: "gm-user-1" }],
};

/** Test-only accessor: every `ChatMessage.create` call recorded so far, in call order. */
export function getCreatedChatMessagesStub(): ChatMessageCreateDataStub[] {
  return createdChatMessages;
}

/** Test-only escape hatch: clears every recorded `ChatMessage.create` call. */
export function resetChatMessageStub(): void {
  createdChatMessages.length = 0;
}

// @ts-expect-error - fvtt-types declares `ChatMessage` as an ambient `const`, not a globalThis property.
globalThis.ChatMessage = ChatMessageStub;

// @ts-expect-error - fvtt-types declares `JournalEntry` as an ambient `const`, not a globalThis property.
globalThis.JournalEntry = JournalEntryStub;

interface RollTableResultStub {
  type: string;
  text: string;
  weight: number;
  range: [number, number];
}

let rollTableIdCounter = 0;
const rollTableStore = new Map<string, RollTableStub>();

/**
 * Real (not mocked) in-memory `RollTable` stand-in — just enough of Foundry's document API
 * (`create`, `normalize`) for src/rolltable/exportPackAsRollTables.ts to be tested without a
 * live Foundry world. `normalize` assigns each result a range proportional to its weight
 * (rounded, minimum 1), close enough to the real weighted-range behavior for tests to assert
 * "a weight-2 entry covers a wider range than a weight-1 entry" without reimplementing core's
 * exact algorithm.
 */
class RollTableStub {
  #id: string;
  name: string;
  results: RollTableResultStub[];

  constructor(id: string, name: string, results: RollTableResultStub[]) {
    this.#id = id;
    this.name = name;
    this.results = results;
  }

  get id(): string {
    return this.#id;
  }

  async normalize(): Promise<this> {
    let cursor = 1;
    for (const result of this.results) {
      const span = Math.max(1, Math.round(result.weight));
      result.range = [cursor, cursor + span - 1];
      cursor += span;
    }
    return this;
  }

  static async create(data: {
    name: string;
    results?: RollTableResultStub[];
  }): Promise<RollTableStub> {
    const table = new RollTableStub(`table-${++rollTableIdCounter}`, data.name, data.results ?? []);
    rollTableStore.set(table.id, table);
    return table;
  }
}

/** Test-only escape hatch: clears every stubbed RollTable. */
export function resetRollTableStub(): void {
  rollTableStore.clear();
  rollTableIdCounter = 0;
}

interface ActorCreateDataStub {
  name: string;
  type: string;
}

let actorIdCounter = 0;
let actorDocumentTypes = ["character"];
const createdActors: Array<ActorCreateDataStub & { id: string }> = [];

/**
 * Real (not mocked) `Actor` stand-in — just `createDocuments`, the only static call
 * src/roster/createRosterActors.ts makes, recording every created actor for test assertions.
 */
const ActorStub = {
  createDocuments: async (
    data: ActorCreateDataStub[],
  ): Promise<Array<ActorCreateDataStub & { id: string }>> => {
    const created = data.map((entry) => ({ ...entry, id: `actor-${++actorIdCounter}` }));
    createdActors.push(...created);
    return created;
  },
};

/** Test-only accessor: every actor created via the stubbed `Actor.createDocuments`, in call order. */
export function getCreatedActorsStub(): Array<ActorCreateDataStub & { id: string }> {
  return createdActors;
}

/** Test-only escape hatch: sets `game.documentTypes.Actor`, e.g. to test the "no registered type" error path. */
export function setActorDocumentTypesStub(types: string[]): void {
  actorDocumentTypes = types;
}

/** Test-only escape hatch: clears every stubbed actor and resets `game.documentTypes.Actor` to its default. */
export function resetActorStub(): void {
  createdActors.length = 0;
  actorIdCounter = 0;
  actorDocumentTypes = ["character"];
}

// @ts-expect-error - fvtt-types declares `Actor` as an ambient `const`, not a globalThis property.
globalThis.Actor = ActorStub;

// @ts-expect-error - fvtt-types declares `RollTable` as an ambient `const`, not a globalThis property.
globalThis.RollTable = RollTableStub;

// Cast: the real CONST.JOURNAL_ENTRY_PAGE_FORMATS/TABLE_RESULT_TYPES values are branded number
// types this stub has no need to reproduce exactly — just their runtime shape.
globalThis.CONST = {
  JOURNAL_ENTRY_PAGE_FORMATS: { HTML: 1, MARKDOWN: 2 },
  TABLE_RESULT_TYPES: { TEXT: "text", DOCUMENT: "document", COMPENDIUM: "pack" },
} as unknown as typeof CONST;

// @ts-expect-error - fvtt-types declares `game` as an ambient `const`, not a globalThis property.
globalThis.game = {
  modules,
  clipboard: { copyPlainText: async (_text: string) => {} },
  i18n,
  settings,
  system,
  journal,
  get documentTypes(): { Actor: string[] } {
    return { Actor: actorDocumentTypes };
  },
};

// @ts-expect-error - fvtt-types declares `ui` as an ambient `const`, not a globalThis property.
globalThis.ui = {
  notifications: { info: () => {}, warn: () => {}, error: () => {} },
};
