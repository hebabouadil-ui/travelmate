import type { Place, TripRequest } from "../types";

/** System prompt that defines the concierge persona. */
export const CONCIERGE_SYSTEM = `You are Voyage AI, a world-class travel concierge and local guide.
You write warm, vivid, concise copy. You understand pacing, local culture, food, and how to
help travellers avoid tourist traps and discover authentic places. You never invent places that
were not provided to you. You respect dietary and budget constraints.`;

interface PlannedStopInput {
  daypart: string;
  name: string;
  category: string;
  hiddenGem?: boolean;
  cuisine?: string;
}

interface PlannedDayInput {
  day: number;
  stops: PlannedStopInput[];
}

/**
 * Build the enrichment prompt. We pass the already-optimized structure
 * (places chosen + ordered geographically) and ask the model only for
 * narrative copy, so the output is always grounded in real data.
 */
export function buildEnrichmentPrompt(
  req: TripRequest,
  days: PlannedDayInput[]
): string {
  const profile = req.profile ?? {};
  return `Create concierge narration for a ${req.days}-day trip to ${req.destination}.

Traveller profile:
- Type: ${profile.travelerType ?? "explorer"}
- Interests: ${req.interests.join(", ") || "general"}
- Budget: ${req.budget}
- Food preference: ${profile.foodPreference ?? "none"}
- Activity level: ${profile.activityLevel ?? "moderate"}

Here is the geographically-optimized plan (do NOT reorder, do NOT add or remove stops):
${JSON.stringify(days, null, 2)}

Return STRICT JSON with this exact shape:
{
  "days": [
    {
      "day": 1,
      "title": "<evocative 3-6 word day title>",
      "summary": "<one inviting sentence about the day's theme>",
      "stops": [
        { "name": "<exact name from input>", "note": "<one helpful insider sentence: what to do, a tip, or why it's special>" }
      ]
    }
  ]
}
Keep notes under 22 words. Match every stop name exactly. Output only JSON.`;
}

/** A compact catalog string used when asking the model to surface hidden gems. */
export function describePlaces(places: Place[]): string {
  return places
    .map((p) => `- ${p.name} (${p.category}${p.hiddenGem ? ", hidden gem" : ""})`)
    .join("\n");
}
