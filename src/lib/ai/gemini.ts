import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AICompletionOptions, AIMessage, AIProvider } from "./provider";

/**
 * Google Gemini implementation of the AI provider layer (free tier).
 * Only this file imports the vendor SDK.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  readonly isLive = true;

  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    this.client = new GoogleGenerativeAI(key);
    this.model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  }

  async complete(messages: AIMessage[], opts: AICompletionOptions = {}): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content;
    const userParts = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: system,
      generationConfig: {
        temperature: opts.temperature ?? 0.8,
        maxOutputTokens: opts.maxOutputTokens ?? 4096,
        responseMimeType: opts.json ? "application/json" : "text/plain",
      },
    });

    const result = await model.generateContent(userParts);
    return result.response.text();
  }
}
