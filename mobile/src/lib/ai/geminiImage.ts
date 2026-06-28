import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../env";

/**
 * Google Gemini image-generation client (same free-tier key as the text
 * provider, a separate model family). Used only to generate the ONE premium
 * destination hero photo when no real curated/Wikipedia photo exists — never
 * for itinerary stop photos. Mirrors gemini.ts's model-candidate fallback and
 * isFatal() dead-key short-circuit: a missing/bad key, exhausted quota, or a
 * candidate model not yet enabled for this key all degrade silently to
 * `undefined` (the caller falls back to a real Wikipedia photo, then a
 * gradient) instead of ever throwing into the UI.
 */

const CANDIDATES = [
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp",
];

let client: GoogleGenerativeAI | null = null;
/** The model that worked last time, tried first on subsequent calls. */
let working: string | null = null;
/** Set when the key itself is invalid/over-quota — stop retrying immediately. */
let dead = false;

function getClient(): GoogleGenerativeAI | null {
  if (!ENV.geminiApiKey) return null;
  if (!client) client = new GoogleGenerativeAI(ENV.geminiApiKey);
  return client;
}

function heroPrompt(subject: string): string {
  return (
    `A breathtaking, photorealistic travel-magazine hero photograph of ${subject}. ` +
    `Show its single most iconic skyline, landmark, or natural scenery in beautiful ` +
    `golden-hour or blue-hour light. Wide cinematic composition, vivid natural colors, ` +
    `sharp ultra-high detail, no people in close-up, no text, no caption, no watermark, no logo.`
  );
}

/**
 * Generate one premium hero photo for a destination as a base64 `data:` URI,
 * or undefined when no key is configured, the key is dead, or every
 * candidate model fails / returns no image part. Never throws.
 */
export async function generateHeroImage(subject: string): Promise<string | undefined> {
  const genai = getClient();
  if (!genai || dead) return undefined;

  const order = working ? [working, ...CANDIDATES.filter((m) => m !== working)] : CANDIDATES;
  const prompt = heroPrompt(subject);

  for (const name of order) {
    try {
      const model = genai.getGenerativeModel({ model: name });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      } as Parameters<typeof model.generateContent>[0]);
      const parts = result.response.candidates?.[0]?.content?.parts ?? [];
      const inline = parts.find((p) => Boolean(p.inlineData?.data))?.inlineData;
      if (inline?.data) {
        working = name;
        return `data:${inline.mimeType || "image/png"};base64,${inline.data}`;
      }
      // No image part: this model answered with text only — try the next.
    } catch (err) {
      if (isFatal(err)) {
        dead = true;
        return undefined;
      }
      // Likely "model not found" / not enabled for this key — try the next candidate.
    }
  }
  return undefined;
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
