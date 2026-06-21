import type {
  Daypart,
  GeoPoint,
  Interest,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  Place,
  PlaceCategory,
  TripRequest,
} from "../types";
import { addDays, haversineKm, makeId, walkingMinutes } from "../utils";
import { geocode, type GeocodeResult } from "../data/geocode";
import { discoverPlaces } from "../data/places";
import { getWeather } from "../data/weather";
import { buildOverview } from "../data/overviews";
import { categoryImage, cityHeroImage as cityImageFor } from "../data/wikipedia";
import { dayRoute } from "../data/routing";
import { clusterIntoDays, nearestWhere, optimizeRoute, planPerDay } from "./optimize";
import { dailyTransport, stopCost } from "./budget";
import { getProvider, extractJson } from "../ai/provider";
import { CONCIERGE_SYSTEM, buildEnrichmentPrompt } from "../ai/prompts";
import { aiPlanItinerary, type AIPlan, type AIStop } from "../ai/itineraryAI";

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

/**
 * Main entry point. AI-first: when Gemini is configured it designs a real,
 * varied, category-aware itinerary for ANY city worldwide; we then add accurate
 * street routing (OSRM) + photos. Without a key it falls back to the on-device
 * engine (free, offline). Either way the result is routed and image-rich.
 */
export async function generateItinerary(req: TripRequest): Promise<Itinerary> {
  // Use the exact picked coordinates when available (avoids ambiguous
  // re-geocoding that could land on the wrong "Málaga"); else geocode the text.
  const geo: GeocodeResult = req.center
    ? {
        name: req.destination.split(",")[0].trim() || req.destination,
        center: req.center,
        displayName: req.destination,
      }
    : await geocode(req.destination);

  const [aiPlan, weather, heroImage, pool] = await Promise.all([
    aiPlanItinerary(req, req.destination).catch(() => null),
    getWeather(geo.center, req.startDate, req.days),
    cityImageFor(geo.name).catch(() => undefined),
    discoverPlaces(req.destination, geo.center).catch(() => [] as Place[]),
  ]);

  let days: ItineraryDay[];
  let overview: string;
  let highlights: string[];
  let country: string | undefined;
  let engine: Itinerary["engine"];

  if (aiPlan) {
    days = buildDaysFromAI(aiPlan, geo, req, weather);
    overview = aiPlan.overview || buildOverview(req).overview;
    highlights = aiPlan.highlights?.length ? aiPlan.highlights : buildOverview(req).highlights;
    country = aiPlan.country;
    engine = "gemini";
  } else {
    days = await buildDeterministicDays(req, geo, weather, pool);
    const ov = buildOverview(req);
    overview = ov.overview;
    highlights = ov.highlights;
    // Honest label: this came from the on-device engine, not the AI.
    engine = "mock";
  }

  // Guarantee every day is full (backfill from the OSM pool) + accurate routing.
  // Per-stop real photos load lazily in the cards (keeps generation fast).
  await finalizeDays(days, pool, geo.center, req);

  const totalEstimatedCost = days.reduce((s, d) => s + d.estimatedCost, 0);

  return {
    id: makeId("trip"),
    destination: geo.name,
    country,
    center: geo.center,
    overview,
    highlights,
    imageUrl: heroImage,
    days,
    profile: req.profile ?? {},
    mode: req.mode ?? "personalized",
    totalEstimatedCost,
    currency: "EUR",
    createdAt: new Date().toISOString(),
    engine,
  };
}

/** Is a coordinate plausible (near the destination, not a hallucination)? */
function validCoord(lat: unknown, lng: unknown, center: GeoPoint): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return haversineKm(center, { lat, lng }) <= 150; // within ~150km of the city
}

function placeFromAIStop(s: AIStop, geo: GeocodeResult, seed: number): Place {
  const center = geo.center;
  const coord = validCoord(s.lat, s.lng, center)
    ? { lat: s.lat as number, lng: s.lng as number }
    : {
        // keep it on-map near the centre with a small deterministic jitter
        lat: center.lat + ((seed % 7) - 3) * 0.004,
        lng: center.lng + (((seed * 3) % 7) - 3) * 0.004,
      };
  const gem =
    /hidden|local favou?rite|off the beaten|secret|tucked/i.test(
      `${s.whyVisit ?? ""} ${s.description ?? ""}`
    );
  return {
    id: makeId("ai"),
    name: s.name,
    category: s.category,
    lat: coord.lat,
    lng: coord.lng,
    description: s.description,
    whyVisit: s.whyVisit,
    neighborhood: s.neighborhood,
    bestTime: s.bestTime,
    cuisine: s.cuisine,
    hiddenGem: gem,
    tags: s.cuisine ? [s.cuisine] : [],
    score: 0.9,
    source: "ai",
    imageUrl: categoryImage(s.category),
  };
}

/** Build itinerary days from the AI plan (routing/images added in finalize). */
function buildDaysFromAI(
  plan: AIPlan,
  geo: GeocodeResult,
  req: TripRequest,
  weather: ItineraryDay["weather"][]
): ItineraryDay[] {
  return plan.days.map((aiDay, idx) => {
    const stops: ItineraryStop[] = aiDay.stops.map((s, j) => {
      const place = placeFromAIStop(s, geo, idx * 13 + j);
      return {
        daypart: s.daypart,
        place,
        durationMin: s.durationMin ?? DURATION[place.category] ?? 60,
        note: s.whyVisit || s.description,
        estimatedCost: stopCost(place.category, req.budget),
      };
    });
    return {
      day: idx + 1,
      date: addDays(req.startDate, idx),
      title: aiDay.title || `Day ${idx + 1}`,
      summary: aiDay.summary || "",
      area: aiDay.area,
      stops,
      estimatedCost: 0,
      weather: weather[idx],
    };
  });
}

const MIN_STOPS_PER_DAY = 4;

/**
 * Post-process: make sure no day is thin (backfill from the OSM pool by
 * proximity, never repeating a place), then compute accurate OSRM routing and
 * per-day cost. Runs per day in parallel.
 */
async function finalizeDays(
  days: ItineraryDay[],
  pool: Place[],
  center: GeoPoint,
  req: TripRequest
): Promise<void> {
  const used = new Set<string>();
  days.forEach((d) => d.stops.forEach((s) => used.add(norm(s.place.name))));

  for (const day of days) {
    const anchor = day.stops[0]?.place ?? center;
    if (day.stops.length < MIN_STOPS_PER_DAY && pool.length) {
      const candidates = pool
        .filter((p) => !used.has(norm(p.name)))
        .sort((a, b) => haversineKm(anchor, a) - haversineKm(anchor, b));
      for (const p of candidates) {
        if (day.stops.length >= MIN_STOPS_PER_DAY) break;
        used.add(norm(p.name));
        if (!p.imageUrl) p.imageUrl = categoryImage(p.category);
        day.stops.push({
          daypart: pickDaypart(day.stops.length),
          place: p,
          durationMin: DURATION[p.category] ?? 60,
          note: p.whyVisit ?? noteFor({ place: p } as ItineraryStop),
          estimatedCost: stopCost(p.category, req.budget),
        });
      }
    }
  }

  await Promise.all(
    days.map(async (day) => {
      if (day.stops.length === 0) {
        day.estimatedCost = dailyTransport(req.budget);
        return;
      }
      const route = await dayRoute(day.stops.map((st) => st.place));
      day.stops.forEach((st, i) => {
        if (i === 0) return;
        const leg = route.legs[i - 1];
        if (leg) {
          st.travelFromPrevMin = leg.durationMin;
          st.travelDistanceKm = leg.distanceKm;
          st.travelMode = leg.mode;
        }
      });
      day.routeGeometry = route.geometry;
      day.estimatedCost =
        day.stops.reduce((s, st) => s + (st.estimatedCost ?? 0), 0) +
        dailyTransport(req.budget);
    })
  );
}

function pickDaypart(index: number): ItineraryStop["daypart"] {
  const order: ItineraryStop["daypart"][] = ["morning", "lunch", "afternoon", "dinner", "evening"];
  return order[Math.min(index, order.length - 1)];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** On-device fallback (no AI key): discovery + clustering. */
async function buildDeterministicDays(
  req: TripRequest,
  geo: GeocodeResult,
  weather: ItineraryDay["weather"][],
  pool: Place[]
): Promise<ItineraryDay[]> {
  const center = geo.center;
  const allPlaces = pool.length ? pool : await discoverPlaces(req.destination, center);
  const scored = scorePlaces(allPlaces, req.interests, req.profile?.foodPreference);
  const sights = scored.filter((p) => !isFood(p) && p.category !== "nightlife");
  const food = scored.filter((p) => isFood(p));

  const counts = planPerDay(
    sights.length,
    req.days,
    maxSightsPerDay(req.profile?.activityLevel)
  );
  const wantsEvening =
    req.profile?.activityLevel === "intensive" ||
    req.interests.includes("nightlife") ||
    req.profile?.travelerType === "couple" ||
    req.days === 1;

  const clusters = clusterIntoDays(sights, counts);
  const usedFood = new Set<string>();
  const usedExtra = new Set<string>();

  const days: ItineraryDay[] = clusters.map((group, idx) => {
    const ordered = optimizeRoute(group, center);
    const stops = buildStops(ordered, food, scored, center, usedFood, usedExtra, req, wantsEvening);
    stops.forEach((st) => {
      if (!st.place.imageUrl) st.place.imageUrl = categoryImage(st.place.category);
    });
    return {
      day: idx + 1,
      date: addDays(req.startDate, idx),
      title: `Day ${idx + 1}`,
      summary: "",
      stops,
      estimatedCost: 0,
      weather: weather[idx],
    };
  });

  const fallbackOverview = buildOverview(req);
  await narrate(req, days, fallbackOverview);
  return days;
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
