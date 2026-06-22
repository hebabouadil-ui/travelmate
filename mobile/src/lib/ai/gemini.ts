import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AICompletionOptions, AIMessage, AIProvider } from "./provider";
import { ENV } from "../env";

/**
 * Google Gemini implementation of the AI provider layer (free tier). Only this
 * file imports the vendor SDK. Runs directly on-device; enabled by setting
 * EXPO_PUBLIC_GEMINI_API_KEY. Without it the MockProvider + templated narration
 * keep the app fully functional and free.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  readonly isLive = true;

  private client: GoogleGenerativeAI;
  /** Candidate models tried in order; the first that works is cached. Makes the
   *  app resilient to model availability (e.g. new keys can't use 1.5 models). */
  private candidates: string[];
  private working: string | null = null;
  /** Set when the key itself is invalid/over-quota — stop retrying immediately. */
  private dead = false;

  constructor() {
    const key = ENV.geminiApiKey;
    if (!key) throw new Error("EXPO_PUBLIC_GEMINI_API_KEY is not set");
    this.client = new GoogleGenerativeAI(key);
    // Fastest-first: low-latency "flash-lite" models lead, then standard flash,
    // then the user's configured model, then legacy. The first that works for
    // this key is cached, so subsequent calls are fast.
    this.candidates = dedupe([
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      ENV.geminiModel,
      "gemini-flash-latest",
      "gemini-1.5-flash",
    ]);
  }

  async complete(
    messages: AIMessage[],
    opts: AICompletionOptions = {}
  ): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content;
    const userParts = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const gen = {
      temperature: opts.temperature ?? 0.8,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      responseMimeType: opts.json ? "application/json" : "text/plain",
    } as const;

    // Try the cached working model first, then fall back through candidates.
    const order = this.working
      ? [this.working, ...this.candidates.filter((m) => m !== this.working)]
      : this.candidates;

    if (this.dead) throw new Error("Gemini key unavailable");

    let lastErr: unknown;
    for (const name of order) {
      try {
        const model = this.client.getGenerativeModel({
          model: name,
          systemInstruction: system,
          generationConfig: gen,
        });
        const result = await model.generateContent(userParts);
        const text = result.response.text();
        this.working = name; // remember the one that worked
        return text;
      } catch (err) {
        lastErr = err;
        if (isFatal(err)) {
          // Bad API key / permission / quota: every model will fail the same
          // way, so stop now (and for the rest of the session) instead of
          // burning time trying each candidate on every request.
          this.dead = true;
          throw err;
        }
        // Otherwise it's likely "model not found" — try the next candidate.
      }
    }
    throw lastErr ?? new Error("Gemini: no available model");
  }
}

/** True for errors where retrying other models is pointless (key/quota/auth). */
function isFatal(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  return (
    msg.includes("api key not valid") ||
    msg.includes("api_key_invalid") ||
    msg.includes("permission") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("429") ||
    msg.includes("billing")
  );
}

function dedupe(arr: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const v of arr) {
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}
