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
import { enrichPopularity } from "../data/popularity";
import { getKnowledgePack, packNameTier, type KnowledgePack } from "../data/knowledge";
import { getWeather } from "../data/weather";
import { buildOverview } from "../data/overviews";
import { categoryImage, cityHeroImage as cityImageFor } from "../data/wikipedia";
import { resolveStopMedia } from "../data/media";
import { currencyForCountry } from "../currency";
import { dayRoute } from "../data/routing";
import { clusterIntoDays, nearestWhere, optimizeRoute, planPerDay } from "./optimize";
import { confidenceScore, isConfidentGem, selectionValue } from "./scoring";
import { dailyTransport, stopCost } from "./budget";
import { getProvider, extractJson } from "../ai/provider";
import { CONCIERGE_SYSTEM, buildEnrichmentPrompt } from "../ai/prompts";
import {
  aiPlanItinerary,
  SLOTS,
  SLOT_DAYPART,
  SLOT_DEFAULT_TIME,
  type AIPlan,
  type AIStop,
} from "../ai/itineraryAI";
import type { GuideSlot } from "../types";

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
        country: req.country,
      }
    : await geocode(req.destination);

  // Fetch the real OSM POI pool IN PARALLEL with the AI call (which is the long
  // pole), so we can VERIFY the AI's places against real mapped locations
  // without adding much wall-clock time. This is the core "real, not fake" step.
  // The pool is also enriched with a REAL popularity signal (Wikidata sitelink
  // counts) so ranking reflects global fame, not just category/proximity. All of
  // this overlaps with the AI call, so it adds little wall-clock time.
  // Destination knowledge pack — curated expert data. Fed to the AI so it
  // ORGANISES around real, verified must-sees instead of inventing, and used to
  // tier/guarantee them afterward. This is the "knowledge first" principle.
  const pack = getKnowledgePack(req.destination);

  const poolPromise = discoverPlaces(req.destination, geo.center)
    .then(async (pl) => {
      await enrichPopularity(pl).catch(() => {});
      return pl;
    })
    .catch(() => [] as Place[]);
  const [aiPlan, weather, heroImage, pool] = await Promise.all([
    aiPlanItinerary(req, req.destination, pack).catch(() => null),
    getWeather(geo.center, req.startDate, req.days),
    cityImageFor(geo.name).catch(() => undefined),
    poolPromise,
  ]);

  let days: ItineraryDay[];
  let overview: string;
  let highlights: string[];
  let country: string | undefined;
  let engine: Itinerary["engine"];

  if (pack) pool.forEach((p) => (p.tier = tierOf(p, pack)));

  if (aiPlan) {
    days = buildDaysFromAI(aiPlan, geo, req, weather);
    // Ground each AI stop to a real OSM POI (snap coords/name/hours) and flag
    // any that can't be verified — so we never present invented data as fact.
    groundDaysToPool(days, pool);
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

  // Knowledge-first quality pass: tier every stop, guarantee Tier-1 must-sees
  // appear (replacing weak anchors), then drop low-confidence attractions.
  applyTiers(days, pack);
  if (pack) injectMustSees(days, pool, pack, geo.name);
  applyTiers(days, pack);
  gateLowConfidence(days);

  // Guarantee every day is full (backfill from the OSM pool) + accurate routing.
  await finalizeDays(days, pool, geo.center, req);

  // Resolve real photos for the FIRST day only, up-front (short cap) so the
  // screen the user lands on looks great immediately. Remaining days keep their
  // instant category image and upgrade lazily as their cards appear — this keeps
  // generation fast and avoids the long waits/timeouts of enriching everything.
  if (days[0]) await enrichStopPhotos(days[0].stops, geo.name);

  // Score every recommendation's confidence and build a data-quality audit so
  // the plan can honestly report how many stops are verified vs. approximated.
  const audit = buildAudit(days, pack);

  const totalEstimatedCost = days.reduce((s, d) => s + d.estimatedCost, 0);
  // Prefer an explicitly picked country, then the AI's, then the geocoder's,
  // then the display-name tail — so currency/locale is rarely wrong.
  const resolvedCountry =
    req.country ?? country ?? geo.country ?? lastSegment(geo.displayName);

  return {
    id: makeId("trip"),
    destination: geo.name,
    country: resolvedCountry,
    center: geo.center,
    overview,
    highlights,
    imageUrl: heroImage,
    days,
    profile: req.profile ?? {},
    mode: req.mode ?? "personalized",
    totalEstimatedCost,
    currency: currencyForCountry(resolvedCountry),
    createdAt: new Date().toISOString(),
    engine,
    audit,
  };
}

/**
 * Compute each stop's confidence score and roll the whole plan up into a
 * data-quality audit (verified vs. approximate, provenance, average confidence).
 */
function buildAudit(days: ItineraryDay[], pack?: KnowledgePack): Itinerary["audit"] {
  let total = 0;
  let verified = 0;
  let fromOSM = 0;
  let fromWikidata = 0;
  let confidenceSum = 0;
  for (const day of days) {
    for (const stop of day.stops) {
      const p = stop.place;
      p.confidence = confidenceScore(p);
      total++;
      confidenceSum += p.confidence;
      if (p.verified) verified++;
      if (p.source === "overpass" || p.verified) fromOSM++;
      if (p.wikidataId || p.wikipediaTitle || p.wikipediaUrl) fromWikidata++;
    }
  }
  return {
    totalStops: total,
    verified,
    approximate: total - verified,
    fromOSM,
    fromWikidata,
    avgConfidence: total ? Math.round((confidenceSum / total) * 100) / 100 : 0,
    destinationConfidence: pack?.confidence,
  };
}

/** Last comma-separated segment of a display name (usually the country). */
function lastSegment(displayName?: string): string | undefined {
  if (!displayName) return undefined;
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1];
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
    imageUrl: categoryImage(s.category, s.name),
  };
}

const NAME_STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "de", "la", "le", "el", "du", "des", "da",
  "di", "do", "las", "los", "al", "san", "santa", "st", "cafe", "restaurant",
  "museum", "park", "bar",
]);

function nameTokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length > 2 && !NAME_STOPWORDS.has(t)
  );
}

/** 0..1 similarity between two place names (exact > substring > token overlap). */
function nameSimilarity(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return 0.85;
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  let inter = 0;
  for (const t of ta) if (setB.has(t)) inter++;
  return inter / Math.max(ta.length, tb.length);
}

/** Find the best real OSM POI for an AI place (by name, guarded by distance). */
function bestPoolMatch(place: Place, pool: Place[], used: Set<string>): Place | null {
  if (norm(place.name).length < 3) return null;
  const aiCoordValid = Number.isFinite(place.lat) && Number.isFinite(place.lng);
  let best: Place | null = null;
  let bestScore = 0;
  for (const p of pool) {
    if (used.has(p.id)) continue;
    const sim = nameSimilarity(place.name, p.name);
    if (sim < 0.55) continue;
    // If the AI gave a usable coordinate, the real POI must be plausibly close.
    if (aiCoordValid && haversineKm(place, p) > 5) continue;
    const score = sim + (p.category === place.category ? 0.1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/**
 * Ground every AI-suggested stop against the real OSM pool: when a confident
 * match exists, snap the coordinates/name to the real place and attach its real
 * opening hours; otherwise mark the stop unverified so the UI never presents an
 * AI approximation as a hard fact.
 */
function groundDaysToPool(days: ItineraryDay[], pool: Place[]): void {
  if (!pool.length) {
    days.forEach((d) => d.stops.forEach((s) => (s.place.verified = false)));
    return;
  }
  const used = new Set<string>();
  for (const day of days) {
    for (const stop of day.stops) {
      const match = bestPoolMatch(stop.place, pool, used);
      if (match) {
        used.add(match.id);
        const p = stop.place;
        p.name = match.name; // canonical, correctly-spelled OSM name
        p.lat = match.lat;
        p.lng = match.lng;
        p.verified = true;
        p.openingHours = p.openingHours ?? match.openingHours;
        p.wikipediaUrl = p.wikipediaUrl ?? match.wikipediaUrl;
        p.wikidataId = p.wikidataId ?? match.wikidataId;
        p.wikipediaTitle = p.wikipediaTitle ?? match.wikipediaTitle;
        p.popularity = match.popularity ?? p.popularity; // real fame signal
        p.neighborhood = p.neighborhood ?? match.neighborhood;
        if (match.cuisine && !p.cuisine) p.cuisine = match.cuisine;
      } else {
        stop.place.verified = false;
      }
      // Hidden-gem is now a confidence decision on real data, not a keyword
      // guess — so the badge only appears on authentic, lower-traffic spots.
      stop.place.hiddenGem = isConfidentGem(stop.place);
    }
  }
}

// ── Knowledge-pack pipeline: tiering, guaranteed must-sees, confidence gate ──

const ATTRACTION_SLOTS = new Set<GuideSlot>([
  "main_attraction", "morning_activity", "afternoon_activity",
]);

/** Tier a place: 1 = pack must-see, 2 = pack strong / very famous, 3 = optional. */
function tierOf(p: Place, pack?: KnowledgePack): 1 | 2 | 3 {
  if (pack) {
    const t = packNameTier(pack, p.name);
    if (t === 1) return 1;
    if (t === 2) return 2;
  }
  const fame = p.popularity ?? 0;
  if (fame >= 0.8) return 1;
  if (fame >= 0.5) return 2;
  return 3;
}

function applyTiers(days: ItineraryDay[], pack?: KnowledgePack): void {
  for (const d of days) for (const s of d.stops) s.place.tier = tierOf(s.place, pack);
}

/** Best verified pool place matching a known name (≥0.7 similarity). */
function bestPoolByName(name: string, pool: Place[], used: Set<string>): Place | null {
  let best: Place | null = null;
  let bestSim = 0;
  for (const p of pool) {
    if (used.has(p.id)) continue;
    const sim = nameSimilarity(name, p.name);
    if (sim >= 0.7 && sim > bestSim) {
      bestSim = sim;
      best = p;
    }
  }
  return best;
}

function nameIsPresent(name: string, present: Set<string>): boolean {
  const nx = norm(name);
  for (const pn of present) {
    if (pn === nx || (nx.length >= 5 && (pn.includes(nx) || nx.includes(pn)))) return true;
  }
  return false;
}

/**
 * Guarantee the destination's Tier-1 must-sees appear: any missing one that we
 * can verify against the real OSM pool REPLACES the weakest (Tier-3) anchor, so
 * a world-famous sight is never absent because a smaller place was closer. We
 * never inject a must-see we can't verify (no invented coordinates).
 */
function injectMustSees(
  days: ItineraryDay[],
  pool: Place[],
  pack: KnowledgePack,
  city: string
): void {
  const present = new Set<string>();
  days.forEach((d) => d.stops.forEach((s) => present.add(norm(s.place.name))));
  const usedPool = new Set<string>();

  for (const name of pack.mustSee) {
    if (nameIsPresent(name, present)) continue;
    const match = bestPoolByName(name, pool, usedPool);
    if (!match) continue; // can't verify it → never invent; skip

    // Find a weak anchor to replace (Tier-3 main attraction, else Tier-3 activity).
    let target: ItineraryStop | undefined;
    for (const d of days) {
      target = d.stops.find((s) => s.slot === "main_attraction" && (s.place.tier ?? 3) >= 3);
      if (target) break;
    }
    if (!target) {
      for (const d of days) {
        target = d.stops.find((s) => ATTRACTION_SLOTS.has(s.slot as GuideSlot) && (s.place.tier ?? 3) >= 3);
        if (target) break;
      }
    }
    if (!target) continue;

    usedPool.add(match.id);
    const p: Place = { ...match, tier: 1, hiddenGem: false };
    if (!p.imageUrl) p.imageUrl = categoryImage(p.category, p.name);
    present.delete(norm(target.place.name));
    present.add(norm(p.name));
    target.place = p;
    target.note = `A must-see of ${city} — one of its defining sights; arrive early to beat the crowds.`;
  }
}

/**
 * Drop low-confidence ATTRACTION stops (<70%), per the spec, while keeping every
 * day complete (≥3 stops and a main attraction). Backfill then refills from the
 * tier-preferred pool. Meals/coffee/sunset/night are structural and never gated.
 */
function gateLowConfidence(days: ItineraryDay[]): void {
  for (const d of days) {
    d.stops.forEach((s) => (s.place.confidence = confidenceScore(s.place)));
    const kept = d.stops.filter((s) => {
      const isAttraction = ATTRACTION_SLOTS.has(s.slot as GuideSlot);
      // Photos resolve later; credit verified places now so a real Tier-2 sight
      // isn't gated just because its photo hasn't been fetched yet.
      const gate =
        (s.place.confidence ?? 0) +
        (s.place.verified && !s.place.photoResolved ? 0.15 : 0);
      return !(isAttraction && gate < 0.7);
    });
    const hadMain = d.stops.some((s) => s.slot === "main_attraction");
    const keepsMain = kept.some((s) => s.slot === "main_attraction");
    if (kept.length >= 3 && (keepsMain || !hadMain)) d.stops = kept;
  }
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
        slot: s.slot,
        startTime: s.startTime,
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
      // Rank by real desirability — global fame (Wikidata) dominates, with only
      // a gentle distance tie-breaker, so the BEST places win and a famous
      // attraction is never dropped just because a minor one is closer.
      const candidates = pool
        .filter((p) => !used.has(norm(p.name)))
        .map((p) => ({ p, v: selectionValue(p, haversineKm(anchor, p), req.interests) }))
        .sort((a, b) => b.v - a.v)
        .map((x) => x.p);
      for (const p of candidates) {
        if (day.stops.length >= MIN_STOPS_PER_DAY) break;
        used.add(norm(p.name));
        if (!p.imageUrl) p.imageUrl = categoryImage(p.category, p.name);
        p.hiddenGem = isConfidentGem(p);
        const slot: GuideSlot = SLOTS[Math.min(day.stops.length, SLOTS.length - 1)];
        day.stops.push({
          daypart: SLOT_DAYPART[slot],
          slot,
          startTime: SLOT_DEFAULT_TIME[slot],
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
      // Now that real travel times are known, lay the day out on the clock.
      scheduleDay(day);
      day.estimatedCost =
        day.stops.reduce((s, st) => s + (st.estimatedCost ?? 0), 0) +
        dailyTransport(req.budget);
    })
  );
}

/**
 * Resolve a real photo (and description) for every stop, in parallel, and embed
 * it on the place so cards show the correct image immediately — and so saved
 * trips keep their photos offline. Bounded by an overall deadline so a slow
 * network never stalls generation; unresolved stops keep their category image.
 */
async function enrichStopPhotos(stops: ItineraryStop[], city: string): Promise<void> {
  const work = Promise.all(
    stops.map(async (st) => {
      if (st.place.photoResolved) return;
      try {
        const media = await resolveStopMedia(st.place, city);
        if (media.imageUrl) st.place.imageUrl = media.imageUrl;
        if (media.description && !st.place.description) {
          st.place.description = media.description;
        }
        st.place.photoResolved = true;
      } catch {
        // keep the existing category image
      }
    })
  );
  // Never let photo enrichment hold generation hostage on a slow connection.
  await Promise.race([
    work,
    new Promise<void>((resolve) => setTimeout(resolve, 6500)),
  ]);
}

function pickDaypart(index: number): ItineraryStop["daypart"] {
  const order: ItineraryStop["daypart"][] = ["morning", "lunch", "afternoon", "dinner", "evening"];
  return order[Math.min(index, order.length - 1)];
}

function parseHM(t?: string): number | null {
  const m = (t ?? "").match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

function fmtHM(min: number): string {
  const h = Math.floor((min % 1440) / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** First opening time (minutes) from an OSM opening_hours string, if parseable. */
function firstOpenMinutes(oh?: string): number | null {
  if (!oh) return null;
  if (/24\/7/.test(oh)) return 0;
  const m = oh.match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

/**
 * Assign each stop a realistic clock time: anchor to the guide's canonical slot
 * time, then push later as real travel + dwell time accumulates — so the day
 * reads like a schedule a local actually walked, never overlapping itself.
 */
function scheduleDay(day: ItineraryDay): void {
  let clock = 8 * 60; // 08:00 default start
  day.stops.forEach((st, i) => {
    const desired =
      parseHM(st.startTime) ?? (st.slot ? parseHM(SLOT_DEFAULT_TIME[st.slot]) : null);
    if (i === 0) {
      clock = desired ?? clock;
    } else {
      const earliest = clock + (st.travelFromPrevMin ?? 0);
      clock = desired != null ? Math.max(earliest, desired) : earliest;
    }
    // Never schedule a stop before it opens (when OSM hours are known).
    const open = firstOpenMinutes(st.place.openingHours);
    if (open != null && clock < open) clock = open;
    st.startTime = fmtHM(clock);
    clock += st.durationMin ?? 60;
  });
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
      if (!st.place.imageUrl) st.place.imageUrl = categoryImage(st.place.category, st.place.name);
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

  const push = (place: Place, daypart: Daypart, slot?: GuideSlot) => {
    const prev = stops[stops.length - 1]?.place;
    const km = prev ? haversineKm(prev, place) : 0;
    const mode: ItineraryStop["travelMode"] =
      km < 1.8 ? "walk" : km < 8 ? "transit" : "taxi";
    stops.push({
      daypart,
      slot,
      startTime: slot ? SLOT_DEFAULT_TIME[slot] : undefined,
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
    push(coffee, "morning", "breakfast");
  }

  // Morning headline sight = the day's main attraction
  if (ordered[0]) push(ordered[0], "morning", "main_attraction");

  // Second sight before lunch, if the day has one
  if (ordered[1]) push(ordered[1], "morning", "morning_activity");

  // Lunch near the morning area (reuse a great spot if the pool is small)
  const lunch = nearestWhere(anchor, food, (p) => p.category === "restaurant", usedFood, true);
  if (lunch) {
    usedFood.add(lunch.id);
    push(lunch, "lunch", "lunch");
  }

  // Afternoon sights (the rest of the cluster)
  ordered.slice(2).forEach((s) => push(s, "afternoon", "afternoon_activity"));

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
    push(goldenHour, "afternoon", "sunset");
  }

  // Dinner near the last sight
  const dinner = nearestWhere(last, food, (p) => p.category === "restaurant", usedFood, true);
  if (dinner) {
    usedFood.add(dinner.id);
    push(dinner, "dinner", "dinner");
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
      push(evening, "evening", "night");
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
