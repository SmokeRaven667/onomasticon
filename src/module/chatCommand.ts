import { loadFullRegistry } from "../browser/loadFullRegistry.js";
import { generateWithRegistry } from "../generateWithRegistry.js";
import { escapeHtml } from "../util/escapeHtml.js";
import { MODULE_ID } from "./constants.js";

const COMMAND_PATTERN = /^\/name(?:\s+(.*))?$/i;

function loadRegistry() {
  return loadFullRegistry({ baseUrl: `modules/${MODULE_ID}/` });
}

async function handleNameCommand(argsText: string): Promise<void> {
  const tokens = argsText.trim().length > 0 ? argsText.trim().split(/\s+/) : [];

  let whisperToGM = false;
  if (tokens[tokens.length - 1]?.toLowerCase() === "gm") {
    whisperToGM = true;
    tokens.pop();
  }

  const [packId, variant] = tokens;
  if (!packId) {
    // Safe: only ever runs from a submitted chat message, long after Foundry's "i18nInit"
    // hook has fired.
    ui.notifications?.error(game.i18n!.localize("ONOMASTICON.ChatCommand.Usage"));
    return;
  }

  try {
    const registry = await loadRegistry();
    const result = generateWithRegistry(packId, { variant }, registry);

    await ChatMessage.create({
      content: escapeHtml(result.full),
      speaker: ChatMessage.getSpeaker(),
      whisper: whisperToGM ? ChatMessage.getWhisperRecipients("GM").map((user) => user.id) : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Safe: same reasoning as above.
    ui.notifications?.error(
      game.i18n!.format("ONOMASTICON.GeneratorApp.ErrorNotification", { error: message }),
    );
  }
}

/**
 * Registers `/name <packId> [variant] [gm]` via Foundry's `chatMessage` hook — the
 * extensibility point core reserves for exactly this: a module intercepting a submitted
 * message before Foundry's own command parser runs, and returning `false` to stop default
 * handling (which would otherwise echo the raw `/name ...` text as an unrecognized message).
 * Lets a name get generated for in-the-moment table use without opening the GeneratorApp
 * dialog at all. `gm` as a trailing token whispers the result to GMs instead of posting
 * publicly — one optional token, not a flag, per this codestep's "no flag soup" decision.
 */
export function registerChatCommand(): void {
  Hooks.on("chatMessage", (_chatLog: unknown, message: string): boolean | void => {
    const match = COMMAND_PATTERN.exec(message.trim());
    if (!match) return;

    void handleNameCommand(match[1] ?? "");
    return false;
  });
}
