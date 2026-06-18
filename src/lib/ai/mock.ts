import type { AICompletionOptions, AIMessage, AIProvider } from "./provider";

/**
 * Deterministic, zero-cost provider used when no API key is configured.
 * It honors the AIProvider contract so calling code never branches on
 * vendor. For enrichment requests the itinerary engine prefers its own
 * templated narration (see engine.ts), so this exists mostly for
 * completeness, manual testing, and offline development.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock" as const;
  readonly isLive = false;

  async complete(messages: AIMessage[], opts: AICompletionOptions = {}): Promise<string> {
    const user = messages.find((m) => m.role === "user")?.content ?? "";
    if (opts.json) {
      // Best-effort: echo an empty days array so the engine falls back to templates.
      return JSON.stringify({ days: [] });
    }
    return `Here is a thoughtful suggestion based on: "${user.slice(0, 80)}…"`;
  }
}
