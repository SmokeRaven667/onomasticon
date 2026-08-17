import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBundledRegistryCache } from "../browser/loadBundledRegistry.js";
import { resetStrategyRegistry } from "../strategies/registry.js";
import { getCreatedChatMessagesStub, resetChatMessageStub } from "../test/foundryStubs.js";
import { registerChatCommand } from "./chatCommand.js";

const GIVEN_LEXICON = { schemaVersion: 1, id: "test-given", entries: [{ value: "Ashan" }] };
const FAMILY_LEXICON = { schemaVersion: 1, id: "test-family", entries: [{ value: "Ostreth" }] };
const PACK = {
  schemaVersion: 1,
  id: "test.pack",
  strategy: "template",
  lexiconRefs: { given: "test-given", family: "test-family" },
  config: {
    slots: {
      given: { kind: "lexicon", lexicon: "given" },
      family: { kind: "lexicon", lexicon: "family" },
    },
    formats: [{ pattern: "{given} {family}" }],
  },
};
const MANIFEST = {
  packs: [{ id: "test.pack", file: "packs/test.pack.json" }],
  lexicons: [
    { id: "test-given", file: "lexicons/test-given.json" },
    { id: "test-family", file: "lexicons/test-family.json" },
  ],
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function stubFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const routes: Record<string, unknown> = {
        "modules/onomasticon/data-manifest.json": MANIFEST,
        "modules/onomasticon/packs/test.pack.json": PACK,
        "modules/onomasticon/lexicons/test-given.json": GIVEN_LEXICON,
        "modules/onomasticon/lexicons/test-family.json": FAMILY_LEXICON,
      };
      const url = String(input);
      return url in routes ? jsonResponse(routes[url]) : jsonResponse(undefined, false, 404);
    }),
  );
}

// Cast: the real `chatMessage` hook signature expects a live ChatLog/chatData shape this test
// has no need to construct — the handler under test only reads `message`.
const callHook = Hooks.call.bind(Hooks) as unknown as (hook: string, ...args: unknown[]) => boolean;

async function submit(message: string): Promise<boolean> {
  return callHook("chatMessage", {}, message, {});
}

// Registered once — Hooks.on has no built-in "off by reference" for an anonymous handler, and
// re-registering per-test would stack up duplicate (functionally identical) listeners under
// the shared HooksStub. A single registration is enough since the handler itself reads fresh
// state (registry, stubbed ChatMessage calls) on every invocation.
registerChatCommand();

beforeEach(() => {
  resetBundledRegistryCache();
  resetStrategyRegistry();
  resetChatMessageStub();
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetBundledRegistryCache();
  resetStrategyRegistry();
  resetChatMessageStub();
});

describe("registerChatCommand", () => {
  it("ignores an ordinary chat message, letting Foundry's own processing continue", async () => {
    const proceeded = await submit("hello table");
    expect(proceeded).toBe(true);
    expect(getCreatedChatMessagesStub()).toHaveLength(0);
  });

  it("intercepts /name <packId> and posts a generated name publicly", async () => {
    const proceeded = await submit("/name test.pack");
    // Wait a tick for the fire-and-forget async handler to finish.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(proceeded).toBe(false);
    const messages = getCreatedChatMessagesStub();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.content).toBe("Ashan Ostreth");
    expect(messages[0]!.whisper).toEqual([]);
  });

  it("whispers to GM when the trailing token is 'gm'", async () => {
    await submit("/name test.pack gm");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const messages = getCreatedChatMessagesStub();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.whisper).toEqual(["gm-user-1"]);
  });

  it("shows a usage error and posts nothing when no packId is given", async () => {
    const proceeded = await submit("/name");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(proceeded).toBe(false);
    expect(getCreatedChatMessagesStub()).toHaveLength(0);
  });

  it("doesn't match a message that merely starts with /name as a prefix of another word", async () => {
    const proceeded = await submit("/namesake test.pack");
    expect(proceeded).toBe(true);
    expect(getCreatedChatMessagesStub()).toHaveLength(0);
  });
});
