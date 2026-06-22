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
import { getKnowledgePack, looseMatch, packNameTier, type KnowledgePack } from "../data/knowledge";
import { getWeather } from "../data/weather";
import { buildOverview } from "../data/overviews";
import { categoryImage, cityHeroImage as cityImageFor } from "../data/wikipedia";
import { resolveStopMedia } from "../data/media";
import { currencyForCountry } from "../currency";
import { dayRoute } from "../data/routing";
import {
  bestNightlifeVenue,
  clusterIntoDays,
  nearestWhere,
  nearestWithinRadius,
  optimizeRoute,
  planPerDay,
} from "./optimize";
import { confidenceScore, isConfidentGem, selectionValue } from "./scoring";
import { categoriesForInterests, INTEREST_CATEGORIES, interestCoverageScore } from "./interests";
import {
  confidenceBand,
  isVerified,
  landmarkCoverageScore,
  normName,
  photoQualityScore,
  qualityLabel,
  qualityScore,
  routeEfficiencyScore,
  timeLogicScore,
  validateCandidate,
  verificationQualityScore,
  weatherAdaptationScore,
  type QualityScoreInputs,
} from "./validate";
import { dailyTransport, stopCost } from "./budget";
import { getProvider, extractJson } from "../ai/provider";
import { CONCIERGE_SYSTEM, buildEnrichmentPrompt } from "../ai/prompts";
import type { GuideSlot } from "../types";
import { SLOTS, SLOT_DAYPART, SLOT_DEFAULT_TIME } from "./slots";
import { leastLoadedOrder, optimizeDayFlow, scheduleDay, sortBySlot } from "./dayflow";

const FOOD_CATEGORIES: PlaceCategory[] = ["restaurant", "cafe"];

/** Restaurant/Café Engine: a meal must come from within walking distance of
 *  the current itinerary, not from anywhere in the city (see `nearestWithinRadius`). */
const WALK_RADIUS_KM = 1.5;

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
 * Main entry point. Data-first, always: real places come from the OSM POI pool
 * and the curated destination Knowledge Pack — never from a model guess. AI is
 * consulted only at the very last stage, to NARRATE the already-chosen, already-
 * routed plan (titles, summaries, per-stop notes); it cannot add, remove, rename
 * or relocate a single stop. Without a configured AI key the same real itinerary
 * is produced with template narration instead.
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

  // Destination knowledge pack — curated expert data. Used to tier/guarantee
  // real must-sees. This is the "knowledge first" principle: AI never sees a
  // place until it has already been selected from real data.
  const pack = getKnowledgePack(req.destination);

  const poolPromise = discoverPlaces(req.destination, geo.center)
    .then(async (pl) => {
      await enrichPopularity(pl).catch(() => {});
      return pl;
    })
    .catch(() => [] as Place[]);
  const [weather, heroImage, rawPool] = await Promise.all([
    getWeather(geo.center, req.startDate, req.days),
    cityImageFor(geo.name).catch(() => undefined),
    poolPromise,
  ]);

  // Candidate Validation: reject anything with missing coordinates, an
  // unknown category, no real signal, a duplicate name, or that's outside
  // the destination or marked permanently closed — never display an invalid
  // candidate. Survivors get the (tightened) Verified badge: a real, mapped
  // OSM object with a real name/category, actually located in the destination.
  const pool = validatePool(rawPool, geo.center);

  if (pack) pool.forEach((p) => (p.tier = tierOf(p, pack)));

  // Select, cluster and route the day from REAL candidates only (pool + pack).
  // AI is invoked inside this step strictly to narrate the result.
  const { days, overview, highlights, engine } = await buildDeterministicDays(req, geo, weather, pool);

  // Knowledge-first quality pass: tier every stop, guarantee Tier-1 must-sees
  // appear (replacing weak anchors, spread across days — never stacked into
  // Day 1), then guarantee every interest the traveller picked is actually
  // represented (Interest Engine — enforced, not just a scoring nudge),
  // then drop low-confidence attractions.
  applyTiers(days, pack);
  if (pack) injectMustSees(days, pool, pack, geo.name);
  ensureInterestCoverage(days, pool, req.interests);
  applyTiers(days, pack);
  gateLowConfidence(days);
  // Adapt each day to its forecast (rain/heat/cold/wind) before routing.
  weatherAdapt(days, pool, req);

  // Guarantee every day is full (backfill from the OSM pool) + accurate routing.
  await finalizeDays(days, pool, geo.center, req);

  // Resolve real photos for the FIRST day only, up-front (short cap) so the
  // screen the user lands on looks great immediately. Remaining days keep their
  // instant category image and upgrade lazily as their cards appear — this keeps
  // generation fast and avoids the long waits/timeouts of enriching everything.
  if (days[0]) await enrichStopPhotos(days[0].stops, geo.name);

  // Score every recommendation's confidence and build a data-quality audit so
  // the plan can honestly report how many stops are verified vs. approximated,
  // and how well the trip covers the traveller's selected interests.
  const audit = buildAudit(days, pack, req.interests);

  const totalEstimatedCost = days.reduce((s, d) => s + d.estimatedCost, 0);
  // Prefer an explicitly picked country, then the geocoder's resolved country,
  // then the display-name tail — so currency/locale is rarely wrong.
  const resolvedCountry = req.country ?? geo.country ?? lastSegment(geo.displayName);

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
 * data-quality audit (verified vs. approximate, provenance, average
 * confidence, and how well the trip covers the traveller's interests).
 */
function buildAudit(
  days: ItineraryDay[],
  pack?: KnowledgePack,
  interests: Interest[] = []
): Itinerary["audit"] {
  let total = 0;
  let verified = 0;
  let fromOSM = 0;
  let fromWikidata = 0;
  let confidenceSum = 0;
  const allStops: ItineraryStop[] = [];
  for (const day of days) {
    for (const stop of day.stops) {
      const p = stop.place;
      p.confidence = confidenceScore(p);
      total++;
      confidenceSum += p.confidence;
      if (p.verified) verified++;
      if (p.source === "overpass" || p.verified) fromOSM++;
      if (p.wikidataId || p.wikipediaTitle || p.wikipediaUrl) fromWikidata++;
      allStops.push(stop);
    }
  }

  const presentNames = allStops.map((s) => s.place.name);
  const inputs: QualityScoreInputs = {
    interestCoverage: interestCoverageScore(allStops.map((s) => s.place), interests),
    landmarkCoverage: landmarkCoverageScore(presentNames, pack?.mustSee ?? [], looseMatch),
    routeEfficiency: routeEfficiencyScore(days),
    timeLogic: timeLogicScore(days),
    photoQuality: photoQualityScore(allStops),
    weatherAdaptation: weatherAdaptationScore(days, isOutdoor),
    verificationQuality: verificationQualityScore(allStops),
  };
  const quality = qualityScore(inputs);

  return {
    totalStops: total,
    verified,
    approximate: total - verified,
    fromOSM,
    fromWikidata,
    avgConfidence: total ? Math.round((confidenceSum / total) * 100) / 100 : 0,
    destinationConfidence: pack?.confidence,
    interestCoverage: Math.round(inputs.interestCoverage * 100),
    qualityScore: quality,
    qualityLabel: qualityLabel(quality),
  };
}

/**
 * Candidate Validation: drop anything with missing coordinates, an unknown
 * category, no real signal, a duplicate name, or that's outside the
 * destination or marked permanently closed (never display an invalid
 * candidate); tighten the Verified badge on every survivor so it reflects a
 * real, mapped OSM object actually located in the destination — not just
 * "has coordinates".
 */
function validatePool(places: Place[], center: GeoPoint): Place[] {
  const seen = new Set<string>();
  const kept: Place[] = [];
  for (const p of places) {
    if (validateCandidate(p, center, seen)) continue;
    p.verified = isVerified(p, center);
    seen.add(norm(p.name));
    kept.push(p);
  }
  return kept;
}

/** Last comma-separated segment of a display name (usually the country). */
function lastSegment(displayName?: string): string | undefined {
  if (!displayName) return undefined;
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1];
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

/** Best verified pool place matching a known name (tolerant token match). */
function bestPoolByName(name: string, pool: Place[], used: Set<string>): Place | null {
  let best: Place | null = null;
  for (const p of pool) {
    if (used.has(p.id)) continue;
    if (!looseMatch(name, p.name)) continue;
    if (!best || (p.popularity ?? 0) > (best.popularity ?? 0)) best = p;
  }
  return best;
}

function nameIsPresent(name: string, presentNames: string[]): boolean {
  return presentNames.some((pn) => looseMatch(name, pn));
}

/**
 * Guarantee the destination's Tier-1 must-sees appear: any missing one that we
 * can verify against the real OSM pool REPLACES the weakest (Tier-3) anchor, so
 * a world-famous sight is never absent because a smaller place was closer. We
 * never inject a must-see we can't verify (no invented coordinates).
 *
 * Injections are spread across days by always picking the least-loaded day
 * with an available weak anchor first — never stacking every missing must-see
 * into Day 1 just because it's scanned first (multi-day balancing).
 */
function injectMustSees(
  days: ItineraryDay[],
  pool: Place[],
  pack: KnowledgePack,
  city: string
): void {
  const presentNames: string[] = [];
  days.forEach((d) => d.stops.forEach((s) => presentNames.push(s.place.name)));
  const usedPool = new Set<string>();
  const injectedPerDay = new Array(days.length).fill(0);

  for (const name of pack.mustSee) {
    if (nameIsPresent(name, presentNames)) continue;
    const match = bestPoolByName(name, pool, usedPool);
    if (!match) continue; // can't verify it → never invent; skip

    const order = leastLoadedOrder(injectedPerDay).map((i) => ({ d: days[i], i }));

    // Find a weak anchor to replace (Tier-3 main attraction, else Tier-3 activity),
    // preferring the day with the fewest must-sees injected so far.
    let target: ItineraryStop | undefined;
    let targetDayIdx = -1;
    for (const { d, i } of order) {
      target = d.stops.find((s) => s.slot === "main_attraction" && (s.place.tier ?? 3) >= 3);
      if (target) { targetDayIdx = i; break; }
    }
    if (!target) {
      for (const { d, i } of order) {
        target = d.stops.find((s) => ATTRACTION_SLOTS.has(s.slot as GuideSlot) && (s.place.tier ?? 3) >= 3);
        if (target) { targetDayIdx = i; break; }
      }
    }
    if (!target) continue;

    usedPool.add(match.id);
    const p: Place = { ...match, tier: 1, hiddenGem: false };
    if (!p.imageUrl) p.imageUrl = categoryImage(p.category, p.name);
    presentNames.push(p.name);
    target.place = p;
    target.note = `A must-see of ${city} — one of its defining sights; arrive early to beat the crowds.`;
    injectedPerDay[targetDayIdx]++;
  }
}

/**
 * Interest Engine: guarantee every interest the traveller actually picked is
 * represented by at least one real stop — not just a scoring nudge that can
 * still lose to fame/distance, an enforced outcome. Any interest with zero
 * matching stops trip-wide gets its single best real OSM candidate swapped
 * into the weakest (Tier-3, non-must-see) attraction slot, spread across the
 * least-loaded day first (same anti-stacking discipline as `injectMustSees`,
 * which always runs first and is never overwritten here). Must-sees always
 * take priority; an interest is left honestly uncovered if the destination's
 * real data has nothing in its category (never invented).
 */
function ensureInterestCoverage(days: ItineraryDay[], pool: Place[], interests: Interest[]): void {
  if (!interests.length) return;
  const present = new Set<PlaceCategory>();
  const used = new Set<string>();
  days.forEach((d) =>
    d.stops.forEach((s) => {
      present.add(s.place.category);
      used.add(norm(s.place.name));
    })
  );
  const injectedPerDay = new Array(days.length).fill(0);

  for (const interest of interests) {
    const wanted = INTEREST_CATEGORIES[interest] ?? [];
    if (wanted.some((c) => present.has(c))) continue; // already represented

    const candidate = pool
      .filter((p) => wanted.includes(p.category) && !used.has(norm(p.name)))
      .sort((a, b) => selectionValue(b, 0, interests) - selectionValue(a, 0, interests))[0];
    if (!candidate) continue; // no real candidate → leave honestly uncovered

    const order = leastLoadedOrder(injectedPerDay);
    let target: ItineraryStop | undefined;
    let targetDayIdx = -1;
    for (const i of order) {
      target = days[i].stops.find(
        (s) => ATTRACTION_SLOTS.has(s.slot as GuideSlot) && (s.place.tier ?? 3) >= 3
      );
      if (target) {
        targetDayIdx = i;
        break;
      }
    }
    if (!target) continue;

    used.add(norm(candidate.name));
    present.add(candidate.category);
    const p: Place = { ...candidate };
    if (!p.imageUrl) p.imageUrl = categoryImage(p.category, p.name);
    target.place = p;
    target.note = `Matched to your interest in ${interest} — a genuine local highlight in this category.`;
    injectedPerDay[targetDayIdx]++;
  }
}

/**
 * Drop only REJECT-band ATTRACTION stops (<50% confidence, per the spec's
 * confidence bands), while keeping every day complete (≥3 stops and a main
 * attraction). 50-69% ("Fallback") stops are kept and shown, just honestly
 * labeled as less certain — they're no longer treated as equally trustworthy
 * as a 90%+ verified must-see, but they're not silently discarded either.
 * Backfill then refills from the tier-preferred pool. Meals/coffee/sunset/
 * night are structural and never gated.
 */
function gateLowConfidence(days: ItineraryDay[]): void {
  for (const d of days) {
    d.stops.forEach((s) => (s.place.confidence = confidenceScore(s.place)));
    const kept = d.stops.filter((s) => {
      const isAttraction = ATTRACTION_SLOTS.has(s.slot as GuideSlot);
      return !(isAttraction && confidenceBand(s.place.confidence ?? 0) === "reject");
    });
    const hadMain = d.stops.some((s) => s.slot === "main_attraction");
    const keepsMain = kept.some((s) => s.slot === "main_attraction");
    if (kept.length >= 3 && (keepsMain || !hadMain)) d.stops = kept;
  }
}

// ── Weather-aware adaptation ────────────────────────────────────────────────

function isIndoor(c: PlaceCategory): boolean {
  return c === "museum" || c === "shopping";
}
function isOutdoor(c: PlaceCategory): boolean {
  return c === "park" || c === "viewpoint" || c === "beach" || c === "monument" || c === "landmark";
}

/** Best indoor alternative near an anchor (museum/indoor market), tier-ranked. */
function findIndoorAlt(
  anchor: GeoPoint,
  pool: Place[],
  used: Set<string>,
  interests: TripRequest["interests"]
): Place | null {
  const cands = pool.filter((p) => isIndoor(p.category) && !used.has(norm(p.name)));
  if (!cands.length) return null;
  cands.sort(
    (a, b) =>
      selectionValue(b, haversineKm(anchor, b), interests) -
      selectionValue(a, haversineKm(anchor, a), interests)
  );
  return cands[0] ?? null;
}

/**
 * Adapt each day to its forecast: on rainy / very hot / cold / windy days, swap
 * flexible OUTDOOR activity slots for the best nearby INDOOR option, and add a
 * timing tip to outdoor must-sees. Must-sees (Tier-1) are never swapped — only
 * re-timed — so the headline experience is preserved.
 */
function weatherAdapt(days: ItineraryDay[], pool: Place[], req: TripRequest): void {
  // Trip-wide name set so a weather swap never duplicates a place used on
  // another day.
  const used = new Set<string>();
  days.forEach((d) => d.stops.forEach((s) => used.add(norm(s.place.name))));

  for (const d of days) {
    const w = d.weather;
    if (!w) continue;
    const hot = w.tempMaxC >= 32;
    const cold = w.tempMaxC <= 8;
    const rainy = w.rainRisk;
    const windy = (w.windKmh ?? 0) >= 40;
    if (!(hot || cold || rainy || windy)) continue;

    for (const s of d.stops) {
      const flexAttr = s.slot === "morning_activity" || s.slot === "afternoon_activity";
      const outdoor = isOutdoor(s.place.category);
      const swap =
        flexAttr &&
        outdoor &&
        s.place.tier !== 1 &&
        (rainy || cold || windy || (hot && s.slot === "afternoon_activity"));
      if (swap) {
        const alt = findIndoorAlt(s.place, pool, used, req.interests);
        if (alt) {
          used.delete(norm(s.place.name));
          used.add(norm(alt.name));
          const reason = rainy ? "rain expected" : hot ? "the afternoon heat" : cold ? "a cold day" : "strong winds";
          const p: Place = { ...alt };
          if (!p.imageUrl) p.imageUrl = categoryImage(p.category, p.name);
          s.place = p;
          s.note = `Indoor pick for ${reason} — swapped from an outdoor stop to keep the day comfortable.`;
          s.durationMin = DURATION[p.category] ?? s.durationMin;
        }
      } else if (s.slot === "main_attraction" && outdoor && (hot || rainy)) {
        const tip = hot
          ? " Go early — afternoons get very hot."
          : " Bring a layer or umbrella — rain is likely.";
        if (s.note && !/early|umbrella|layer/i.test(s.note)) s.note += tip;
      }
    }
  }
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
      // Guarantee morning→night order, then minimise back-and-forth within each
      // part of the day (constrained 2-opt) before computing the real route.
      day.stops = optimizeDayFlow(sortBySlot(day.stops));
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
      // Now that real travel times are known, lay the day out on the clock,
      // anchoring the sunset slot to the real local sunset for this day.
      scheduleDay(day.stops, day.weather?.sunsetTime);
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

const norm = normName;

/**
 * Build the real, data-first plan: discover + score + cluster + route real
 * places into days, then hand the finished structure to the AI narrator
 * (titles/summaries/notes only — it cannot add, remove or move a stop).
 */
async function buildDeterministicDays(
  req: TripRequest,
  geo: GeocodeResult,
  weather: ItineraryDay["weather"][],
  pool: Place[]
): Promise<{ days: ItineraryDay[]; overview: string; highlights: string[]; engine: Itinerary["engine"] }> {
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
  const engine = await narrate(req, days, fallbackOverview);
  return { days, overview: fallbackOverview.overview, highlights: fallbackOverview.highlights, engine };
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
  const boosted = categoriesForInterests(interests);

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
  const coffee = nearestWithinRadius(anchor, pool, (p) => p.category === "cafe", usedExtra, WALK_RADIUS_KM, true);
  if (coffee) {
    usedExtra.add(coffee.id);
    push(coffee, "morning", "breakfast");
  }

  // Morning headline sight = the day's main attraction
  if (ordered[0]) push(ordered[0], "morning", "main_attraction");

  // Second sight before lunch, if the day has one
  if (ordered[1]) push(ordered[1], "morning", "morning_activity");

  // Lunch within walking distance of the morning area (reuse a great spot
  // rather than picking one from across town if the pool is small).
  const lunch = nearestWithinRadius(anchor, food, (p) => p.category === "restaurant", usedFood, WALK_RADIUS_KM, true);
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

  // Dinner within walking distance of the last sight
  const dinner = nearestWithinRadius(last, food, (p) => p.category === "restaurant", usedFood, WALK_RADIUS_KM, true);
  if (dinner) {
    usedFood.add(dinner.id);
    push(dinner, "dinner", "dinner");
  }

  // Optional evening: a real nightlife district first, else a scenic viewpoint
  if (wantsEvening) {
    const nightlifePool = pool.filter((p) => p.category === "nightlife");
    const evening =
      bestNightlifeVenue(last, nightlifePool, usedExtra, true) ??
      nearestWhere(last, pool, (p) => p.category === "viewpoint", usedExtra, true);
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
 * mutated in place when the model returns better copy. Returns which engine
 * actually produced the narration, for the plan's `engine` field.
 */
async function narrate(
  req: TripRequest,
  days: ItineraryDay[],
  overview: { overview: string; highlights: string[] }
): Promise<Itinerary["engine"]> {
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
        return provider.name;
      }
    } catch {
      // fall through to templates
    }
  }

  templateNarration(req, days);
  return "mock";
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
