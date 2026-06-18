// ─────────────────────────────────────────────────────────────
// AI Provider Layer (mobile)
// ─────────────────────────────────────────────────────────────
// A single abstraction the rest of the app talks to. Swapping Gemini for
// OpenAI / Claude / OpenRouter is a one-line change here — application logic
// never imports a vendor SDK directly. When no key is configured we fall back
// to the deterministic MockProvider, so the entire product runs at ZERO cost,
// fully on-device, offline-capable.
// ─────────────────────────────────────────────────────────────
import { ENV } from "../env";
import { MockProvider } from "./mock";
import { GeminiProvider } from "./gemini";

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
 * Resolve the active provider. Order of precedence:
 *   1. EXPO_PUBLIC_AI_PROVIDER (gemini | mock)
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
  const requested = ENV.aiProvider;

  if (requested === "mock") return new MockProvider();

  if ((requested === "gemini" || !requested) && ENV.geminiApiKey) {
    try {
      return new GeminiProvider();
    } catch {
      return new MockProvider();
    }
  }

  // Graceful, free, offline default.
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
