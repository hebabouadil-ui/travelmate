// ─────────────────────────────────────────────────────────────
// AI Provider Layer
// ─────────────────────────────────────────────────────────────
// A single abstraction the rest of the app talks to. Swapping
// Gemini for OpenAI / Claude / OpenRouter is a one-line change in
// `getProvider()` — application logic never imports a vendor SDK
// directly. When no key is configured we fall back to the deterministic
// `MockProvider`, so the entire product runs at ZERO cost.
// ─────────────────────────────────────────────────────────────

export interface AIMessage {
  role: "system" | "user";
  content: string;
}

export interface AICompletionOptions {
  /** Ask the provider to return strict JSON. */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIProvider {
  readonly name: "gemini" | "openai" | "claude" | "mock";
  /** Returns true when a real API key is configured. */
  readonly isLive: boolean;
  complete(messages: AIMessage[], opts?: AICompletionOptions): Promise<string>;
}

export type ProviderName = AIProvider["name"];

let cached: AIProvider | null = null;

/**
 * Resolve the active provider from env. Order of precedence:
 *   1. AI_PROVIDER env var (gemini | openai | claude | mock)
 *   2. Whichever vendor key is present
 *   3. mock (always works, no cost)
 */
export function getProvider(): AIProvider {
  if (cached) return cached;
  cached = createProvider();
  return cached;
}

/** For tests / hot-reload. */
export function resetProvider() {
  cached = null;
}

function createProvider(): AIProvider {
  const requested = (process.env.AI_PROVIDER || "").toLowerCase();

  // Lazy require keeps vendor SDKs out of the bundle when unused.
  if (requested === "mock") return makeMock();

  if ((requested === "gemini" || !requested) && process.env.GEMINI_API_KEY) {
    return makeGemini();
  }

  // Future providers are wired here without touching app logic:
  // if (requested === "openai" && process.env.OPENAI_API_KEY) return makeOpenAI();
  // if (requested === "claude" && process.env.ANTHROPIC_API_KEY) return makeClaude();

  // Graceful, free, offline default.
  return makeMock();
}

function makeGemini(): AIProvider {
  const { GeminiProvider } = require("./gemini") as typeof import("./gemini");
  return new GeminiProvider();
}

function makeMock(): AIProvider {
  const { MockProvider } = require("./mock") as typeof import("./mock");
  return new MockProvider();
}

/** Helper: parse a JSON object out of a possibly-noisy model response. */
export function extractJson<T>(raw: string): T {
  const trimmed = raw.trim();
  // Strip ```json fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in AI response");
  }
  return JSON.parse(body.slice(start, end + 1)) as T;
}
