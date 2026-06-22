# Voyage AI — Architecture Audit & Improvement Roadmap

_Audit of the React Native (Expo) app under `mobile/`. Scope: architecture,
data quality, search, itinerary engine, maps, photos, performance, UX._

This is a living document. Items marked **✅ DONE** were completed in the
current work stream; the rest form the roadmap.

---

## 1. System Overview

```
app/ (expo-router screens)
 ├─ (tabs): Discover · Plan · Nearby · Trips · Profile
 ├─ trip/[id]: itinerary detail (map, timeline, stops)
 └─ onboarding

src/lib
 ├─ ai/         Gemini provider, prompt builders, chunked itinerary planner
 ├─ itinerary/  engine (AI-first → deterministic fallback), optimize, budget
 ├─ data/       geocode, search, places(Overpass), weather, wikipedia,
 │              foursquare, media (photo resolution), routing(OSRM)
 ├─ match.ts    destination recommendation scoring (Discover)
 └─ store/      Zustand + AsyncStorage persistence
```

**Data sources (all free / keyless except Gemini & Foursquare):** Nominatim
(geocode/search), Overpass (POIs), Open-Meteo (weather), Wikipedia + Wikimedia
Commons (photos/descriptions), OSRM (routing), Gemini (itinerary text),
Foursquare (venue photos, optional).

**Core flow:** `generateItinerary` → AI plan (Gemini, chunked) → fallback to
deterministic engine → backfill thin days from Overpass → OSRM routing → photo
enrichment → persisted to store.

---

## 2. Issue Register

### CRITICAL

**C1 — AI invents place coordinates (and sometimes places).**
- **Problem:** The model returns `lat/lng` it guessed; stops can be mislocated
  or fabricated (e.g. NYC venues surfacing for "Ontario").
- **Root cause:** `itineraryAI.ts` asks Gemini for "approximate lat & lng";
  `engine.ts#validCoord` only rejects coordinates >150 km from center, so
  plausible-but-wrong coordinates pass. No grounding against a real POI DB.
- **Impact:** Wrong map pins, impossible routes, loss of trust.
- **Solution:** Grounding layer — for each AI stop, snap to the nearest real
  OSM/Overpass POI by name+proximity (or geocode the name within the city);
  if no match within N km, mark coordinates as unverified and keep it off the
  routed path. Never display invented ratings/hours (see C2).

**C2 — No data-quality contract for places.**
- **Problem:** Stops may show fabricated notes; ratings/hours/review counts are
  absent or implied.
- **Root cause:** Place model has no `source`-gated required fields; UI renders
  whatever exists.
- **Impact:** Hallucinated facts; fails Phase 3 requirement.
- **Solution:** Define a verified-place contract (name, coords, category,
  duration, photo, source required; rating/hours/reviews optional and shown as
  "Information unavailable" when missing). Tag every field with provenance.

**C3 — Ambiguous geocoding → wrong city + wrong currency.**
- **Problem:** "Ontario" → province centroid; Canada trip shows **€**.
- **Root cause:** `geocode.ts` takes Nominatim's first result (no type
  preference for settlements) and returns no `country`; `engine.ts` derives
  country from the display-name tail, which fails when the picked suggestion
  `value` lacks a country. `currencyForCountry(undefined) → EUR`.
- **Impact:** Wrong locale, wrong prices, off-target POIs.
- **Solution:** ✅ (in progress) Geocode with `addressdetails`, prefer
  city/town/admin results, always return a resolved `country`; thread it
  through to currency. **See roadmap P1.**

### HIGH

**H1 — Same stock photo per category.** ✅ DONE
- **Root cause:** `enrichPlace` fell back to a *seedless* category image, so all
  places in a category shared one photo.
- **Solution shipped:** `enrichPlace` now returns a real photo or nothing; added
  keyless **Wikimedia Commons geosearch** (`commonsPhotoNear`) for real
  on-location photos; `resolveStopMedia` applies a strict source hierarchy and
  only falls back to a category image **seeded by place name**.

**H2 — Photos slow / not loading on weak connections.** ✅ DONE
- **Root cause:** Wikipedia `original` images are multi-MB; full-trip photo
  enrichment blocked generation up to 14 s.
- **Solution shipped:** prefer thumbnails everywhere; shrink fallbacks
  (`w=500&q=70`); enrich only day 1 up-front (6.5 s cap), lazy-load the rest;
  premium skeleton placeholder.

**H3 — Generation latency / timeouts.** ◐ PARTIAL
- **Root cause:** Serial Gemini chunks + Overpass backfill + OSRM + (previously)
  photo blocking; 55 s race.
- **Done:** photo work moved off the critical path; timeout 55→75 s; faster
  Gemini model auto-select.
- **Remaining:** parallelise Gemini chunks; cap/short-circuit Overpass; cache
  warm POI pools; show partial results progressively.

**H4 — Search robustness for arbitrary cities.**
- **Problem:** Madrid/Tangier/Dieppe/Moncton reportedly return poor/no results.
- **Root cause:** Single Nominatim call, no typo tolerance, no settlement
  ranking, hard dependency on one endpoint; rate-limit/UA failures yield `[]`.
- **Impact:** Dead-ends at the very first step.
- **Solution:** Rank by place class (city/town/village/admin), add a relaxed
  second query on empty, debounce + cache (present), and a seed-city fuzzy
  fallback so the field is never empty. **Roadmap P1.**

**H5 — Itinerary variety / ordering not guaranteed.**
- **Problem:** Risk of museum-after-museum; "hidden gems" are keyword-detected.
- **Root cause:** Variety relies on the prompt; deterministic fallback has a
  daypart template but no category-flow scorer; gems = regex on text.
- **Solution:** Attraction scoring engine (rating, popularity, distance,
  category match, opening status, time-of-day relevance) + a daypart flow
  policy (landmark→museum→food→park→sunset→dinner→nightlife). Gem confidence
  score from rating + low-traffic signals. **Roadmap P2–P3.**

### MEDIUM

- **M1 — Discover cards are thin** (image + match% only). Add attraction count,
  safety/weather/budget/best-months. Needs a destination facts dataset.
- **M2 — Category logic overlaps.** Categories map to Overpass tags but lack
  per-category curation (e.g. nightlife = bars/clubs/rooftops). Build
  category-specific query profiles + dedup across categories.
- **M3 — Weather adaptation absent.** Weather is displayed, not used to
  re-rank indoor/outdoor stops by day. Add weather-aware reordering.
- **M4 — Routing assumes walking.** OSRM walking profile only; no transit/
  driving selection by leg distance beyond heuristic labels.
- **M5 — Recommendation dedup is name-only.** No semantic similarity; near-dupes
  ("Old Town" vs "Historic Old Town") can both appear.

### LOW

- **L1 — `@expo/vector-icons` + embedded Ionicons font now unused** (migrated to
  Lucide). Remove dependency + `expo-font` plugin entry to slim the build.
- **L2 — `weatherEmoji` now unused** (replaced by `weatherIcon`). Remove.
- **L3 — Profile hero still uses a (muted) gradient;** consider flat per design.
- **L4 — No analytics/error telemetry** to observe real failures in the field.

---

## 3. Priority Matrix

| ID | Severity | Impact | Effort | Priority |
|----|----------|--------|--------|----------|
| C3 | Critical | High | Low | **P1 — now** |
| H4 | High | High | Low | **P1 — now** |
| C1 | Critical | High | High | P2 |
| C2 | Critical | High | Med | P2 |
| H5 | High | High | High | P3 |
| H3 | High | Med | Med | P3 |
| M2 | Med | Med | Med | P4 |
| M1 | Med | Med | Med | P4 |
| M3 | Med | Med | Low | P4 |
| M5 | Med | Low | Med | P5 |
| L1–L4 | Low | Low | Low | P5 |

(H1, H2 already shipped.)

---

## 4. Roadmap

- **P1 (this iteration):** Search + geocode rebuild (H4, C3) — settlement-ranked
  results, relaxed fallback, always-resolved country → correct currency &
  on-target POIs.
- **P2:** Place-grounding + data-quality contract (C1, C2) — snap AI stops to
  real POIs; "Information unavailable" instead of invented facts.
- **P3:** Attraction scoring engine + daypart flow + gem confidence (H5);
  parallelise generation (H3).
- **P4:** Category query profiles (M2), weather-aware reordering (M3), richer
  Discover cards (M1).
- **P5:** Semantic dedup (M5), cleanups (L1–L4), telemetry.

---

## 5. Progress Log

- ✅ Migrated all iconography to Lucide SVG (reliable in release APKs, premium).
- ✅ Refined palette (muted teal accent, off-white canvas), pills/badges,
  stepper proportions, whitespace.
- ✅ Premium light loading screen (radar pulse, indeterminate progress).
- ✅ H1 — distinct real per-place photos (Commons geosearch + seeded fallback).
- ✅ H2 — photo loading speed (thumbnails, day-1 up-front, lazy rest).
- ◐ H3 — generation latency (partial).
- ✅ P2 — verified places: AI stops grounded to real OSM POIs (coords/name/
  hours), unmatched flagged unverified.
- ✅ P3 — attraction scoring with REAL fame signal (Wikidata sitelink counts);
  fame dominates distance; confidence-based hidden gems.
- ✅ Per-stop confidence score + itinerary self-audit panel (verified /
  approximate / OSM / Wikidata / avg confidence).
- ✅ Guided full-day structure (breakfast → night) with clock times + reasons.
- ✅ V2 Knowledge Packs: curated expert data for 9 flagship cities (Marrakech,
  Madrid, Tangier, Tokyo, Paris, Rome, Barcelona, Istanbul, Lisbon) — must-see
  tiers, sunset/food/neighborhood/cultural picks, best months, budget, weather.
- ✅ V2 Tier 1/2/3 priority; Tier-1 dominates selection; missing must-sees are
  injected (replacing weak anchors) — verified against OSM, never invented.
- ✅ V2 confidence factors per spec (verified, photo, hours, knowledge match,
  fame) + <70% gating for attractions (day always stays complete).
- ✅ V2 knowledge-first AI: pack fed INTO the prompt so AI organises around real
  verified picks rather than inventing. Opening-hours guard in scheduling.
- ✅ V2 Discover cards enriched (attraction count, best months, budget).
- ✅ V3 weather-aware days: rain / extreme heat / cold / wind swap flexible
  outdoor activities for the best nearby indoor option (must-sees re-timed, not
  swapped); wind added to the forecast.
- ✅ V3 expertise expansion: knowledge packs grown to ~60 curated destinations
  across Morocco, Spain, France, Italy, Japan, Thailand and the UK.
- ✅ V3 route intelligence: nearest-neighbour replaced by constrained 2-opt
  day-flow optimisation (minimises travel while preserving breakfast→night
  temporal order — no zig-zag).
- ◐ Staged: Pexels photo fallback, full Discover redesign (weather-suitability
  blocks), real astronomical sunset times.

## 6. Ranking Methodology (how "best" is decided)

Free data (OSM/Wikipedia) has **no review counts or star ratings**, so we never
invent them. Ranking uses only source-backed signals:

| Signal | Source | Weight | Notes |
|---|---|---|---|
| **Global fame / popularity** | Wikidata sitelink count (# of language Wikipedias) | **0.60 (dominant)** | log-scaled 0..1; Eiffel Tower ≈200 langs → ~1.0, minor site → ~0.1 |
| Category tourist value | curated table | 0.30 | monument > museum > park > café/mall |
| Interest match | user's selected interests | 0.20 | boosts categories the traveller asked for |
| Verified | OSM match | 0.06 | real, mapped location |
| Hidden-gem | confidence model | 0.04 | authentic, low-traffic only |

**Distance is only a ~0.005/km tie-breaker** at selection time, so a world-famous
attraction is never dropped because a smaller place is closer.

**Per category:**
- **Restaurants / cafés / nightlife:** OSM has *no* quality signal for these, so
  they cannot be truly ranked "best" on free data — they're ranked by category
  value + interest + proximity and marked **lower confidence**. True
  best-restaurant ranking requires a paid reviews API (Google Places / Foursquare).
- **Monuments / landmarks / museums / attractions:** ranked by real fame
  (Wikidata) — this is where the engine is genuinely strong.
- **Hidden gems:** by definition *not* famous, so fame can't rank them; we label
  a gem only when it's a verified, authentic, low-traffic spot above a threshold.

**Confidence score (per stop, 0..1):** verified +0.40, documented (Wikidata/
Wikipedia) +0.25, popularity known +0.15, real coordinates +0.10, concrete
attributes (hours/cuisine) +0.10.
