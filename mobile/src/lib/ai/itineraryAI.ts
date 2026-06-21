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
You always return STRICT, COMPLETE, valid JSON and nothing else.`;

const DAYPARTS: Daypart[] = ["morning", "lunch", "afternoon", "dinner", "evening"];
const CATEGORIES: PlaceCategory[] = [
  "monument", "museum", "attraction", "landmark", "restaurant",
  "cafe", "beach", "park", "viewpoint", "nightlife", "shopping",
];

function stopsPerDay(activity?: string): number {
  if (activity === "relaxed") return 5;
  if (activity === "intensive") return 7;
  return 6;
}

/** How many days to request per API call (keeps responses well under token limits). */
const CHUNK = 3;

function chunkPrompt(
  req: TripRequest,
  place: string,
  fromDay: number,
  toDay: number,
  avoid: string[],
  wantMeta: boolean
): string {
  const p = req.profile ?? {};
  const personalized = req.mode !== "recommended";
  const interests = req.interests?.length ? req.interests.join(", ") : "general sightseeing";
  const per = stopsPerDay(p.activityLevel);
  const meta = wantMeta
    ? `"overview": "<2-3 vivid sentences on why ${place} is worth visiting>",
  "highlights": ["<3-5 short reasons to go>"],
  "country": "<country>",
  `
    : "";

  return `Design days ${fromDay}-${toDay} of a ${req.days}-day trip to ${place}.

TRAVELLER: group/style ${p.travelerType ?? "explorer"}, budget ${req.budget}, food ${p.foodPreference ?? "none"}, pace ${p.activityLevel ?? "moderate"} (~${per} stops/day incl. meals).
MODE: ${personalized ? `PERSONALIZED — strongly weight these interests: ${interests}. The chosen categories MUST change which places appear.` : "RECOMMENDED — the most iconic, must-see experiences."}

RULES
- Use ONLY real, specific, named places in ${place} (as Google/locals know them). No generic names.
- DO NOT use any of these already-planned places: ${avoid.length ? avoid.join("; ") : "(none yet)"}.
- Each day explores a DIFFERENT neighborhood/area with DIFFERENT places. More days = wider exploration (further areas, day-trips, variety).
- ~${per} stops/day ordered morning→evening, clustered to minimise travel, with a real lunch AND dinner restaurant; add cafe/viewpoint/park where natural; include 1-2 authentic hidden gems.
- Provide approximate lat & lng for EVERY stop.
- Keep "description" and "whyVisit" to ONE short sentence each (<14 words).

Return STRICT JSON ONLY:
{
  ${meta}"days": [
    {
      "day": ${fromDay},
      "title": "<3-6 word theme>",
      "summary": "<1 sentence>",
      "area": "<neighborhood>",
      "stops": [
        {"name":"<real place>","category":"<${CATEGORIES.join("|")}>","daypart":"<${DAYPARTS.join("|")}>","description":"<short>","whyVisit":"<short>","durationMin":<int>,"bestTime":"<short>","neighborhood":"<area>","cuisine":"<for food only>","lat":<num>,"lng":<num>}
      ]
    }
  ]
}`;
}

function normCategory(c: string): PlaceCategory {
  const v = (c || "").toLowerCase().trim();
  if (CATEGORIES.includes(v as PlaceCategory)) return v as PlaceCategory;
  if (/museum|gallery/.test(v)) return "museum";
  if (/monument|temple|church|mosque|cathedral|palace/.test(v)) return "monument";
  if (/restaurant|food|eat|dining/.test(v)) return "restaurant";
  if (/cafe|coffee|bakery/.test(v)) return "cafe";
  if (/beach/.test(v)) return "beach";
  if (/park|garden|nature/.test(v)) return "park";
  if (/view|lookout|panoram/.test(v)) return "viewpoint";
  if (/bar|club|night|pub/.test(v)) return "nightlife";
  if (/shop|market|mall|souk|bazaar/.test(v)) return "shopping";
  if (/landmark|square|bridge|plaza/.test(v)) return "landmark";
  return "attraction";
}

function normDaypart(d: string): Daypart {
  const v = (d || "").toLowerCase().trim();
  return (DAYPARTS.includes(v as Daypart) ? v : "afternoon") as Daypart;
}

function clampInt(n: unknown, min: number, max: number, def: number): number {
  const v = typeof n === "number" ? n : parseInt(String(n ?? ""), 10);
  if (Number.isNaN(v)) return def;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function cleanDays(rawDays: AIDay[] | undefined, startDay: number): AIDay[] {
  if (!Array.isArray(rawDays)) return [];
  return rawDays
    .map((d, i) => ({
      day: startDay + i,
      title: d.title || `Day ${startDay + i}`,
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
}

/**
 * Ask Gemini to design the itinerary, in chunks of a few days per request so
 * long trips never hit the output-token limit (the cause of empty 7-day plans).
 * Chunks share an "avoid" list so days don't repeat places. Returns null if the
 * provider isn't live or nothing usable came back (caller falls back locally).
 */
export async function aiPlanItinerary(
  req: TripRequest,
  place: string
): Promise<AIPlan | null> {
  const provider = getProvider();
  if (!provider.isLive) return null;

  const allDays: AIDay[] = [];
  const avoid: string[] = [];
  let overview = "";
  let highlights: string[] = [];
  let country: string | undefined;

  try {
    for (let from = 1; from <= req.days; from += CHUNK) {
      const to = Math.min(from, req.days) + Math.min(CHUNK, req.days - from + 1) - 1;
      const wantMeta = from === 1;
      const raw = await provider.complete(
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: chunkPrompt(req, place, from, to, avoid, wantMeta) },
        ],
        { json: true, temperature: 0.9, maxOutputTokens: 8192 }
      );
      const parsed = extractJson<AIPlan>(raw);
      const days = cleanDays(parsed.days, from);
      if (wantMeta) {
        overview = parsed.overview || "";
        highlights = Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 5) : [];
        country = parsed.country;
      }
      for (const d of days) {
        allDays.push(d);
        for (const s of d.stops) avoid.push(s.name);
      }
      // Stop early if the model returned nothing for a chunk.
      if (days.length === 0 && from === 1) break;
    }
  } catch {
    // partial results are still useful
  }

  if (allDays.length === 0) return null;
  // Renumber sequentially in case a chunk was skipped.
  allDays.forEach((d, i) => (d.day = i + 1));
  return { overview, highlights, country, days: allDays.slice(0, req.days) };
}
