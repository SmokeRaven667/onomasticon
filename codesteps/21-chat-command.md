# Step 21 — Chat Command

**Status:** ✅ Done — engine/API done and automated-tested; live Foundry verification not separately performed (see DoD)
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [14](14-public-api-surface.md)

## Goal

Let a name get generated without opening the dialog at all, for in-the-moment table use.

## Deliverables

- [x] `/name` chat command, parsed via the chat message hook, posts the result to chat (with a whisper option) — `src/module/chatCommand.ts`

## Key decisions

- Syntax: `/name <packId> [variant] [gm]` — a trailing `gm` token whispers the result to GMs (`ChatMessage.getWhisperRecipients("GM")`) instead of posting publicly. One optional token, not a flag (`--whisper`, `--to=gm`, etc.) — satisfies "posts the result to chat (with a whisper option)" while keeping the "no flag soup" constraint literal.
- Implemented via Foundry's `chatMessage` hook (`Hooks.on("chatMessage", (chatLog, message) => ...)`) — the exact extensibility point core reserves for a module to intercept a submitted message before Foundry's own command parser runs. Returning `false` when the message matches `/^\/name(?:\s+(.*))?$/i` stops default handling (which would otherwise echo the raw, unrecognized `/name ...` text); returning `undefined` for anything else lets Foundry's normal chat processing continue untouched.
- Registered unconditionally at module load (`registerChatCommand()` called directly in `src/index.ts`, not deferred inside `Hooks.once("init", ...)`) — same pattern `registerLaunchPoint()` already uses: `Hooks.on(...)` itself is safe to call anytime (it's just appending to a listener list), only the handler _body_ (which touches `game.i18n`/`ChatMessage`) needs to wait for later lifecycle hooks, and it naturally does since it only runs once a message is actually submitted.
- Reuses `loadFullRegistry`/`generateWithRegistry` directly (its own small `loadRegistry()` helper), same as `GeneratorApp`/`module/api.ts` each doing their own — no new shared caching layer introduced, consistent with the project's existing tolerance for this small duplication (the expensive I/O underneath is still cached once per path/id).
- Chat content is HTML-escaped (`escapeHtml`, newly extracted to `src/util/escapeHtml.ts` — previously private to step 20's `sendToJournal.ts`, now shared by both call sites that drop pack-sourced text into a Foundry HTML field) before being posted, since `ChatMessage.content` renders as HTML and pack-sourced values (including user-authored packs via step 17) aren't fully trusted input.
- No packId (`/name` alone, or `/name gm`) shows a usage error notification and posts nothing — same "reject and warn, don't half-succeed" instinct as this project's other input-validation paths, not a new pattern.

## Open questions

- None.

## Definition of done

- [x] Typing `/name highfantasy.elven masc` in chat posts a generated name — `src/module/chatCommand.test.ts` covers interception vs. pass-through (an ordinary message and a `/namesake ...` near-miss both correctly fall through to Foundry's own processing), public vs. `gm`-whispered posting, and the no-packId usage-error path, all against a real bundled-style test pack/registry (same fetch-stubbing pattern as `module/api.test.ts`); live Foundry verification (typing the command in a real chat box) not separately performed, same gap class as steps 13/17/19/20
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (170 tests, up from 165); build output confirmed free of `node:fs`/`node:path`/`node:url`
