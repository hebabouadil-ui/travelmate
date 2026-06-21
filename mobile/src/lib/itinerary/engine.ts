import type {
  Daypart,
  Interest,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  Place,
  PlaceCategory,
  TripRequest,
} from "../types";
import { addDays, haversineKm, makeId, walkingMinutes } from "../utils";
import { geocode } from "../data/geocode";
import { discoverPlaces } from "../data/places";
import { getWeather } from "../data/weather";
import { buildOverview } from "../data/overviews";
import { clusterIntoDays, nearestWhere, optimizeRoute, planPerDay } from "./optimize";
import { dailyTransport, stopCost } from "./budget";
import { getProvider, extractJson } from "../ai/provider";
import { CONCIERGE_SYSTEM, buildEnrichmentPrompt } from "../ai/prompts";

const FOOD_CATEGORIES: PlaceCategory[] = ["restaurant", "cafe"];

const INTEREST_BOOST: Record<Interest, PlaceCategory[]> = {
  monuments: ["monument", "landmark"],
  museums: ["museum"],
  beaches: ["beach"],
  nature: ["park", "viewpoint", "beach"],
  food: ["restaurant", "cafe"],
  architecture: ["landmark", "monument", "attraction"],
  shopping: ["shopping"],
  photography: ["viewpoint", "landmark"],
  nightlife: ["nightlife"],
};

const DURATION: Record<PlaceCategory, number> = {
  museum: 90,
  monument: 60,
  attraction: 75,
  landmark: 45,
  park: 60,
  beach: 90,
  viewpoint: 30,
  restaurant: 75,
  cafe: 40,
  nightlife: 90,
  shopping: 60,
};

/**
 * Max sights to schedule per day by pace. Higher than before so days feel full;
 * a 1-day trip is packed up to this cap (the "give me the maximum" case).
 */
function maxSightsPerDay(activity?: string): number {
  if (activity === "relaxed") return 4;
  if (activity === "intensive") return 6;
  return 5;
}

/** Main entry point: produce a complete, optimized, narrated itinerary. */
export async function generateItinerary(req: TripRequest): Promise<Itinerary> {
  const geo = await geocode(req.destination);
  const center = geo.center;

  const [allPlaces, weather] = await Promise.all([
    discoverPlaces(req.destination, center),
    getWeather(center, req.startDate, req.days),
  ]);

  const scored = scorePlaces(
    allPlaces,
    req.interests,
    req.profile?.foodPreference
  );
  const sights = scored.filter((p) => !isFood(p) && p.category !== "nightlife");
  const food = scored.filter((p) => isFood(p));

  // Spread sights evenly so every day — early or late — stays rich.
  const counts = planPerDay(
    sights.length,
    req.days,
    maxSightsPerDay(req.profile?.activityLevel)
  );
  const wantsEvening =
    req.profile?.activityLevel === "intensive" ||
    req.interests.includes("nightlife") ||
    req.profile?.travelerType === "couple" ||
    req.days === 1; // a single day should make the most of the evening too

  const clusters = clusterIntoDays(sights, counts);
  const usedFood = new Set<string>();
  const usedExtra = new Set<string>();

  const days: ItineraryDay[] = clusters.map((group, idx) => {
    const day = idx + 1;
    const ordered = optimizeRoute(group, center);
    const stops = buildStops(
      ordered,
      food,
      scored,
      center,
      usedFood,
      usedExtra,
      req,
      wantsEvening
    );
    const estimatedCost =
      stops.reduce((s, st) => s + (st.estimatedCost ?? 0), 0) +
      dailyTransport(req.budget);
    return {
      day,
      date: addDays(req.startDate, idx),
      title: `Day ${day}`,
      summary: "",
      stops,
      estimatedCost,
      weather: weather[idx],
    };
  });

  const fallbackOverview = buildOverview(req);
  await narrate(req, days, fallbackOverview);

  const totalEstimatedCost = days.reduce((s, d) => s + d.estimatedCost, 0);
  const provider = getProvider();

  return {
    id: makeId("trip"),
    destination: geo.name,
    center,
    overview: fallbackOverview.overview,
    highlights: fallbackOverview.highlights,
    days,
    profile: req.profile ?? {},
    totalEstimatedCost,
    currency: "EUR",
    createdAt: new Date().toISOString(),
    engine: provider.isLive ? "gemini" : "mock",
  };
}

function isFood(p: Place): boolean {
  return FOOD_CATEGORIES.includes(p.category);
}

/** Boost places matching the traveller's interests + food preference. */
function scorePlaces(
  places: Place[],
  interests: Interest[],
  foodPref?: string
): Place[] {
  const boosted = new Set<PlaceCategory>();
  interests.forEach((i) => INTEREST_BOOST[i]?.forEach((c) => boosted.add(c)));

  return places
    .map((p) => {
      let score = p.score ?? 0.5;
      if (boosted.has(p.category)) score += 0.35;
      if (p.hiddenGem) score += 0.08; // gentle nudge toward authentic spots
      if (
        isFood(p) &&
        foodPref &&
        foodPref !== "none" &&
        p.tags?.includes(foodPref)
      ) {
        score += 0.3;
      }
      return { ...p, score };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function buildStops(
  ordered: Place[],
  food: Place[],
  pool: Place[],
  center: { lat: number; lng: number },
  usedFood: Set<string>,
  usedExtra: Set<string>,
  req: TripRequest,
  wantsEvening: boolean
): ItineraryStop[] {
  const stops: ItineraryStop[] = [];
  const anchor = ordered[0] ?? center;

  const push = (place: Place, daypart: Daypart) => {
    const prev = stops[stops.length - 1]?.place;
    const km = prev ? haversineKm(prev, place) : 0;
    const mode: ItineraryStop["travelMode"] =
      km < 1.8 ? "walk" : km < 8 ? "transit" : "taxi";
    stops.push({
      daypart,
      place,
      durationMin: DURATION[place.category] ?? 60,
      travelFromPrevMin: prev
        ? mode === "walk"
          ? walkingMinutes(km)
          : Math.max(8, Math.round((km / (mode === "transit" ? 18 : 30)) * 60))
        : 0,
      travelMode: prev ? mode : undefined,
      estimatedCost: stopCost(place.category, req.budget),
    });
  };

  // Optional morning coffee at a nearby café — a small touch that makes the
  // day feel curated rather than a bare list of monuments.
  const coffee = nearestWhere(anchor, pool, (p) => p.category === "cafe", usedExtra, true);
  if (coffee) {
    usedExtra.add(coffee.id);
    push(coffee, "morning");
  }

  // Morning headline sight
  if (ordered[0]) push(ordered[0], "morning");

  // Second sight before lunch, if the day has one
  if (ordered[1]) push(ordered[1], "morning");

  // Lunch near the morning area (reuse a great spot if the pool is small)
  const lunch = nearestWhere(anchor, food, (p) => p.category === "restaurant", usedFood, true);
  if (lunch) {
    usedFood.add(lunch.id);
    push(lunch, "lunch");
  }

  // Afternoon sights (the rest of the cluster)
  ordered.slice(2).forEach((s) => push(s, "afternoon"));

  const last = ordered[ordered.length - 1] ?? anchor;

  // Golden-hour viewpoint / park to break up the sightseeing
  const goldenHour = nearestWhere(
    last,
    pool,
    (p) => p.category === "viewpoint" || p.category === "park",
    usedExtra,
    false
  );
  if (goldenHour && !ordered.includes(goldenHour)) {
    usedExtra.add(goldenHour.id);
    push(goldenHour, "afternoon");
  }

  // Dinner near the last sight
  const dinner = nearestWhere(last, food, (p) => p.category === "restaurant", usedFood, true);
  if (dinner) {
    usedFood.add(dinner.id);
    push(dinner, "dinner");
  }

  // Optional evening: nightlife or a scenic viewpoint
  if (wantsEvening) {
    const evening = nearestWhere(
      last,
      pool,
      (p) => p.category === "nightlife" || p.category === "viewpoint",
      usedExtra,
      true
    );
    if (evening) {
      usedExtra.add(evening.id);
      push(evening, "evening");
    }
  }

  return stops;
}

/**
 * Enrich the structural plan with concierge narration + a destination overview.
 * Uses the live AI provider when available; otherwise falls back to grounded
 * templates so the output is always polished and free. The `overview` object is
 * mutated in place when the model returns better copy.
 */
async function narrate(
  req: TripRequest,
  days: ItineraryDay[],
  overview: { overview: string; highlights: string[] }
): Promise<void> {
  const provider = getProvider();

  if (provider.isLive) {
    try {
      const input = days.map((d) => ({
        day: d.day,
        stops: d.stops.map((s) => ({
          daypart: s.daypart,
          name: s.place.name,
          category: s.place.category,
          hiddenGem: s.place.hiddenGem,
          cuisine: s.place.cuisine,
        })),
      }));
      const raw = await provider.complete(
        [
          { role: "system", content: CONCIERGE_SYSTEM },
          { role: "user", content: buildEnrichmentPrompt(req, input) },
        ],
        { json: true, temperature: 0.85 }
      );
      const parsed = extractJson<{
        overview?: string;
        highlights?: string[];
        days: {
          day: number;
          title: string;
          summary: string;
          stops: { name: string; note: string }[];
        }[];
      }>(raw);
      if (parsed.days?.length) {
        applyNarration(days, parsed.days);
        if (parsed.overview && parsed.overview.length > 40) overview.overview = parsed.overview;
        if (parsed.highlights?.length) overview.highlights = parsed.highlights.slice(0, 5);
        // Still backfill any notes the model skipped.
        backfillNotes(req, days);
        return;
      }
    } catch {
      // fall through to templates
    }
  }

  templateNarration(req, days);
}

/** Ensure every stop has a note even if the model missed some. */
function backfillNotes(req: TripRequest, days: ItineraryDay[]): void {
  for (const d of days) {
    if (!d.title) d.title = `Day ${d.day}`;
    for (const stop of d.stops) {
      if (!stop.note) stop.note = noteFor(stop);
    }
  }
}

function applyNarration(
  days: ItineraryDay[],
  narrated: {
    day: number;
    title: string;
    summary: string;
    stops: { name: string; note: string }[];
  }[]
) {
  for (const d of days) {
    const n = narrated.find((x) => x.day === d.day);
    if (!n) continue;
    if (n.title) d.title = n.title;
    if (n.summary) d.summary = n.summary;
    for (const stop of d.stops) {
      const match = n.stops?.find(
        (s) => s.name.toLowerCase() === stop.place.name.toLowerCase()
      );
      if (match?.note) stop.note = match.note;
    }
  }
}

const TITLES = [
  "Icons & first impressions",
  "Hidden corners & local flavor",
  "Culture, parks & golden hour",
  "Neighborhoods & authentic bites",
  "Views, markets & slow mornings",
  "Coast, calm & city lights",
  "Backstreets & local secrets",
];

function templateNarration(req: TripRequest, days: ItineraryDay[]): void {
  days.forEach((d, i) => {
    const headlineStop = d.stops.find((s) => !isFood(s.place)) ?? d.stops[0];
    const headline = headlineStop?.place.name;
    const sightCount = d.stops.filter(
      (s) => !isFood(s.place) && s.place.category !== "viewpoint"
    ).length;
    d.title = headline ? `${TITLES[i % TITLES.length]}` : `Day ${d.day}`;
    d.summary = headline
      ? `A ${pace(sightCount)} day around ${headline} and nearby spots — everything's grouped close together so you spend the day exploring, not commuting. Expect ${sightCount} key ${sightCount === 1 ? "sight" : "sights"}, a couple of great meals and time to wander.`
      : `A relaxed day soaking up ${req.destination} at your own pace.`;
    for (const stop of d.stops) {
      if (stop.note) continue;
      stop.note = noteFor(stop);
    }
  });
}

function pace(sightCount: number): string {
  if (sightCount >= 4) return "full, high-energy";
  if (sightCount <= 1) return "relaxed, unhurried";
  return "well-balanced";
}

/** Richer, more specific concierge note per stop (used offline / as backfill). */
function noteFor(stop: ItineraryStop): string {
  const p = stop.place;
  const gem = p.hiddenGem ? " A local favourite that most visitors miss." : "";
  switch (p.category) {
    case "restaurant":
      return (
        (p.cuisine
          ? `Sit down for standout ${p.cuisine}. Go a little before peak hours or book ahead — locals do.`
          : "A well-loved local table — come hungry and order what the regulars are having.") + gem
      );
    case "cafe":
      return `Recharge with proper coffee and a pastry before the next stretch.${gem}`;
    case "museum":
      return "Give yourself 60–90 minutes for the highlights; mornings and late afternoons are quietest and queues are shortest.";
    case "monument":
      return "An unmissable landmark — arrive early or near closing for softer light and thinner crowds, and look up: the details are the point.";
    case "landmark":
      return `Soak in the atmosphere and wander the streets right around it — this is where the city's character shows.${gem}`;
    case "viewpoint":
      return "Time this for golden hour: the light is unreal and it's the photo you'll actually keep.";
    case "park":
      return "A green breather between sights — grab a bench, people-watch, and reset for the afternoon.";
    case "beach":
      return "Bring water, sunscreen and a towel; it's loveliest in the late afternoon as the heat eases.";
    case "shopping":
      return `Browse for local finds and souvenirs — half the fun is the side stalls.${gem}`;
    case "nightlife":
      return "Cap the day with the local night scene — go later than you think; things warm up after dark.";
    case "attraction":
      return `A genuine highlight worth building the day around.${gem}`;
    default:
      return p.hiddenGem ? "A local favourite, off the usual trail." : "Worth a wander.";
  }
}

/**
 * Recompute a single day's route, travel times and cost after a stop is
 * removed — powering the DYNAMIC itinerary editing experience on-device.
 */
export function recomputeDay(
  day: ItineraryDay,
  center: { lat: number; lng: number },
  budget: TripRequest["budget"]
): ItineraryDay {
  // Keep daypart anchors (lunch/dinner) but re-derive travel legs in order.
  const stops = day.stops.map((s) => ({ ...s }));
  for (let i = 0; i < stops.length; i++) {
    const prev = stops[i - 1]?.place;
    const cur = stops[i].place;
    if (!prev) {
      stops[i].travelFromPrevMin = 0;
      stops[i].travelMode = undefined;
      continue;
    }
    const km = haversineKm(prev, cur);
    const mode: ItineraryStop["travelMode"] =
      km < 1.8 ? "walk" : km < 8 ? "transit" : "taxi";
    stops[i].travelMode = mode;
    stops[i].travelFromPrevMin =
      mode === "walk"
        ? walkingMinutes(km)
        : Math.max(8, Math.round((km / (mode === "transit" ? 18 : 30)) * 60));
  }
  const estimatedCost =
    stops.reduce((s, st) => s + (st.estimatedCost ?? 0), 0) +
    dailyTransport(budget);
  return { ...day, stops, estimatedCost };
}
