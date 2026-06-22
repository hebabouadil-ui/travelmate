import type { Daypart, GuideSlot, PlaceCategory, TripRequest } from "../types";
import { getProvider, extractJson } from "./provider";

export interface AIStop {
  name: string;
  category: PlaceCategory;
  daypart: Daypart;
  /** Which moment of the guided day this is. */
  slot?: GuideSlot;
  /** Suggested arrival clock time, e.g. "08:00". */
  startTime?: string;
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

const SYSTEM = `You are Voyage AI, a brilliant LOCAL GUIDE — not a search engine.
You do NOT produce lists of attractions. You design COMPLETE, realistic days: exactly what the traveller should do from the moment they wake up until the end of the night.
You think in experiences and MOMENTS, with a clear REASON for every choice, and you weave in best timing, crowd-avoidance, weather sense and budget awareness — like a friend who lives there walking them through the perfect day.
You use ONLY real, specific, named places that genuinely exist in the destination (as locals/Google know them). You NEVER invent places.
You always return STRICT, COMPLETE, valid JSON and nothing else.`;

const DAYPARTS: Daypart[] = ["morning", "lunch", "afternoon", "dinner", "evening"];

/** The fixed guided-day skeleton, in order. */
export const SLOTS: GuideSlot[] = [
  "breakfast", "morning_activity", "main_attraction", "lunch",
  "afternoon_activity", "coffee_break", "sunset", "dinner", "night",
];

export const SLOT_DAYPART: Record<GuideSlot, Daypart> = {
  breakfast: "morning",
  morning_activity: "morning",
  main_attraction: "morning",
  lunch: "lunch",
  afternoon_activity: "afternoon",
  coffee_break: "afternoon",
  sunset: "evening",
  dinner: "dinner",
  night: "evening",
};

export const SLOT_DEFAULT_TIME: Record<GuideSlot, string> = {
  breakfast: "08:00",
  morning_activity: "09:00",
  main_attraction: "10:30",
  lunch: "13:00",
  afternoon_activity: "15:00",
  coffee_break: "16:30",
  sunset: "18:00",
  dinner: "20:00",
  night: "22:00",
};
const CATEGORIES: PlaceCategory[] = [
  "monument", "museum", "attraction", "landmark", "restaurant",
  "cafe", "beach", "park", "viewpoint", "nightlife", "shopping",
];

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
  const meta = wantMeta
    ? `"overview": "<2-3 vivid sentences on why ${place} is worth visiting>",
  "highlights": ["<3-5 short reasons to go>"],
  "country": "<country>",
  `
    : "";

  const relaxed = p.activityLevel === "relaxed";
  return `Plan days ${fromDay}-${toDay} of a ${req.days}-day trip to ${place} as a LOCAL GUIDE designing the perfect complete day — not a list of attractions.

TRAVELLER: group/style ${p.travelerType ?? "explorer"}, budget ${req.budget}, food ${p.foodPreference ?? "none"}, pace ${p.activityLevel ?? "moderate"}.
MODE: ${personalized ? `PERSONALIZED — strongly weight these interests: ${interests}. They MUST shape the activities and main attraction chosen.` : "RECOMMENDED — the most iconic, must-see experiences."}

DESIGN EACH DAY AS A GUIDED EXPERIENCE — answer "what should I do from waking up to night?". Follow THIS EXACT structure, in order, one stop per slot:
1. breakfast (cafe/restaurant) — start the day right, near where the day begins
2. morning_activity — an experience to ease in (a walk, market, neighborhood, garden) BEFORE crowds
3. main_attraction — the headline sight of the day (best visited early to beat crowds)
4. lunch (restaurant) — real, local, near the morning area
5. afternoon_activity — a second experience/sight in a DIFFERENT nearby spot
6. coffee_break (cafe) — a genuine local spot to recharge${relaxed ? " (OPTIONAL for relaxed pace)" : ""}
7. sunset — the BEST place in the city to catch golden hour (rooftop, viewpoint, hilltop, waterfront)
8. dinner (restaurant) — a memorable evening table
9. night — the local night atmosphere (bar, rooftop, lively square, live music)${relaxed ? " (OPTIONAL for relaxed pace)" : ""}

RULES
- Use ONLY real, specific, named places in ${place}. No generic names ("a local cafe"). Every place must actually exist.
- DO NOT reuse any of these already-planned places: ${avoid.length ? avoid.join("; ") : "(none yet)"}.
- Each day = a DIFFERENT neighborhood with a DIFFERENT main_attraction. More days = wider exploration.
- Cluster each day tightly to minimise travel between consecutive slots.
- EVERY stop needs a "reason" (whyVisit): WHY this place AND why at this time — fold in crowd-avoidance and best timing (e.g. "go before 10am to beat tour groups"). Vivid, specific, <24 words.
- Give a realistic "startTime" (HH:MM) and "durationMin" for every slot; respect opening hours and a natural pace.
- "bestTime" = ideal time/conditions (e.g. "early morning", "golden hour"). Provide approximate lat & lng for EVERY stop.

Return STRICT JSON ONLY:
{
  ${meta}"days": [
    {
      "day": ${fromDay},
      "title": "<evocative 3-6 word day theme>",
      "summary": "<1 inviting sentence on the day's arc>",
      "area": "<main neighborhood>",
      "stops": [
        {"slot":"<${SLOTS.join("|")}>","startTime":"<HH:MM>","name":"<real place>","category":"<${CATEGORIES.join("|")}>","whyVisit":"<reason incl. timing/crowd insight>","durationMin":<int>,"bestTime":"<short>","neighborhood":"<area>","cuisine":"<for food only>","lat":<num>,"lng":<num>}
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

function normSlot(s: string): GuideSlot | undefined {
  const v = (s || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  return SLOTS.includes(v as GuideSlot) ? (v as GuideSlot) : undefined;
}

/** Accept "8:00", "08:00", "8" → "08:00"; reject junk. */
function normTime(t: unknown): string | undefined {
  const m = String(t ?? "").match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return undefined;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
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
        .map((s) => {
          const slot = normSlot((s.slot ?? "") as string);
          return {
            ...s,
            category: normCategory(s.category as string),
            slot,
            startTime: normTime(s.startTime) ?? (slot ? SLOT_DEFAULT_TIME[slot] : undefined),
            // Keep daypart consistent with the slot when we have one.
            daypart: slot ? SLOT_DAYPART[slot] : normDaypart(s.daypart as string),
            durationMin: clampInt(s.durationMin, 20, 240, 60),
          };
        }),
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
