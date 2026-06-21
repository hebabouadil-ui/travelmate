import type { Daypart, PlaceCategory, TripRequest } from "../types";
import { getProvider, extractJson } from "./provider";

export interface AIStop {
  name: string;
  category: PlaceCategory;
  daypart: Daypart;
  description?: string;
  whyVisit?: string;
  durationMin?: number;
  lat?: number;
  lng?: number;
  neighborhood?: string;
  bestTime?: string;
  cuisine?: string;
}

export interface AIDay {
  day: number;
  title: string;
  summary: string;
  area?: string;
  stops: AIStop[];
}

export interface AIPlan {
  overview: string;
  highlights: string[];
  country?: string;
  days: AIDay[];
}

const SYSTEM = `You are Voyage AI, an elite local travel concierge with deep, accurate knowledge of cities worldwide.
You design realistic, high-quality day-by-day itineraries using REAL, named places that actually exist in the destination.
You never invent fake places. You balance world-famous highlights with authentic hidden gems locals love.
You understand pacing, neighborhoods, opening hours and how travellers actually move through a city.`;

const DAYPARTS: Daypart[] = ["morning", "lunch", "afternoon", "dinner", "evening"];

const CATEGORIES: PlaceCategory[] = [
  "monument", "museum", "attraction", "landmark", "restaurant",
  "cafe", "beach", "park", "viewpoint", "nightlife", "shopping",
];

function stopsPerDay(activity?: string): number {
  if (activity === "relaxed") return 5;
  if (activity === "intensive") return 8;
  return 6;
}

function buildPrompt(req: TripRequest, place: string): string {
  const p = req.profile ?? {};
  const personalized = req.mode !== "recommended";
  const interests = req.interests?.length ? req.interests.join(", ") : "general sightseeing";
  const per = stopsPerDay(p.activityLevel);

  return `Plan a ${req.days}-day trip to ${place}.

TRAVELLER
- Group / style: ${p.travelerType ?? "explorer"}
- Budget: ${req.budget}
- Food preference: ${p.foodPreference ?? "none"}
- Pace: ${p.activityLevel ?? "moderate"} (~${per} stops/day including meals)
- Mode: ${personalized ? `PERSONALIZED — heavily weight these interests: ${interests}` : "RECOMMENDED — the best, most iconic experiences for any first-time visitor"}

HARD REQUIREMENTS
1. Use ONLY real, specific, named places in ${place} (exact names as a local/Google would know them). No generic names like "a local cafe".
2. ${personalized
    ? `Make the plan clearly reflect the interests (${interests}). If "food": food-forward with great restaurants/markets/cafes. If "monuments"/"architecture": landmark-heavy. If "nature": parks/gardens/viewpoints/beaches. If "shopping": markets/boutiques. If "nightlife": bars/live venues in the evening. Categories MUST change the selection.`
    : `Pick the highest-rated, must-see attractions and signature experiences.`}
3. VARIETY & DURATION: A ${req.days}-day plan must explore widely. Each day covers a DIFFERENT neighborhood/area with DIFFERENT places — never repeat a place. More days = broader coverage (further neighborhoods, day-trips, diverse categories). A 7-day plan must be substantially richer and more spread out than a 3-day or 1-day plan.
4. Each day: ~${per} stops ordered morning→evening, geographically clustered to minimise travel, with at least one lunch and one dinner (real restaurants). Add cafe/viewpoint/park where it fits.
5. Mix iconic highlights with 1-2 authentic hidden gems per day.
6. For EVERY stop provide approximate coordinates (lat, lng) to your best knowledge.

Return STRICT JSON only:
{
  "overview": "<2-3 vivid sentences on why ${place} is worth visiting>",
  "highlights": ["<3-5 short reasons to go>"],
  "country": "<country name>",
  "days": [
    {
      "day": 1,
      "title": "<evocative 3-6 word theme>",
      "summary": "<1-2 sentences on the day>",
      "area": "<main neighborhood/area>",
      "stops": [
        {
          "name": "<exact real place name>",
          "category": "<one of: ${CATEGORIES.join(" | ")}>",
          "daypart": "<one of: ${DAYPARTS.join(" | ")}>",
          "description": "<one factual sentence about the place>",
          "whyVisit": "<one inviting sentence on why it's special / what to do>",
          "durationMin": <integer minutes to spend>,
          "bestTime": "<short, e.g. 'Early morning'>",
          "neighborhood": "<area>",
          "cuisine": "<for restaurants/cafes only>",
          "lat": <number>,
          "lng": <number>
        }
      ]
    }
  ]
}
Output ONLY the JSON.`;
}

function normCategory(c: string): PlaceCategory {
  const v = (c || "").toLowerCase().trim();
  if (CATEGORIES.includes(v as PlaceCategory)) return v as PlaceCategory;
  if (v.includes("museum") || v.includes("gallery")) return "museum";
  if (v.includes("monument") || v.includes("temple") || v.includes("church") || v.includes("mosque")) return "monument";
  if (v.includes("restaurant") || v.includes("food") || v.includes("eat")) return "restaurant";
  if (v.includes("cafe") || v.includes("coffee")) return "cafe";
  if (v.includes("beach")) return "beach";
  if (v.includes("park") || v.includes("garden") || v.includes("nature")) return "park";
  if (v.includes("view") || v.includes("lookout")) return "viewpoint";
  if (v.includes("bar") || v.includes("club") || v.includes("night")) return "nightlife";
  if (v.includes("shop") || v.includes("market") || v.includes("mall")) return "shopping";
  if (v.includes("landmark") || v.includes("square") || v.includes("bridge")) return "landmark";
  return "attraction";
}

function normDaypart(d: string): Daypart {
  const v = (d || "").toLowerCase().trim();
  return (DAYPARTS.includes(v as Daypart) ? v : "afternoon") as Daypart;
}

/**
 * Ask Gemini to design the full itinerary. Returns null if the AI provider is
 * not live or the response can't be parsed (caller falls back to the local
 * engine). Coordinates here are approximate and refined later via geocoding.
 */
export async function aiPlanItinerary(
  req: TripRequest,
  place: string
): Promise<AIPlan | null> {
  const provider = getProvider();
  if (!provider.isLive) return null;

  try {
    const raw = await provider.complete(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(req, place) },
      ],
      { json: true, temperature: 0.9, maxOutputTokens: 8192 }
    );
    const parsed = extractJson<AIPlan>(raw);
    if (!parsed?.days?.length) return null;

    // Normalise & clamp
    parsed.days = parsed.days
      .slice(0, req.days)
      .map((d, i) => ({
        day: i + 1,
        title: d.title || `Day ${i + 1}`,
        summary: d.summary || "",
        area: d.area,
        stops: (d.stops || [])
          .filter((s) => s?.name)
          .map((s) => ({
            ...s,
            category: normCategory(s.category as string),
            daypart: normDaypart(s.daypart as string),
            durationMin: clampInt(s.durationMin, 20, 240, 60),
          })),
      }))
      .filter((d) => d.stops.length > 0);

    if (!parsed.days.length) return null;
    parsed.highlights = Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 5) : [];
    return parsed;
  } catch {
    return null;
  }
}

function clampInt(n: unknown, min: number, max: number, def: number): number {
  const v = typeof n === "number" ? n : parseInt(String(n ?? ""), 10);
  if (Number.isNaN(v)) return def;
  return Math.min(max, Math.max(min, Math.round(v)));
}
