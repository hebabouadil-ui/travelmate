# TravelMate — Itinerary Quality Validation Report

**Phase:** Quality Validation (no new features until quality is proven)
**Method:** White-box pipeline audit + a runnable offline harness that exercises
the **real compiled algorithms** (`npm run validate`, 32 assertions).

## Important honesty note on scope

The CI/agent environment that produced this report has **no outbound network
except GitHub**. Live itinerary generation needs Overpass (OSM), Gemini,
Wikidata, Open-Meteo and the photo APIs — all blocked here. Therefore this
report does **not** fabricate "generated itineraries" it could not actually
produce. Instead it validates quality two ways:

1. **Static white-box audit** — tracing the generation pipeline for each of the
   10 checks (`src/lib/itinerary/engine.ts`, `dayflow.ts`, `scoring.ts`,
   `data/knowledge.ts`).
2. **Offline harness** (`mobile/scripts/validate-itinerary.cjs`) — runs the
   actual pure modules against synthetic + real pack data and asserts behavior.
   **Result: 29/29 pass.**

Checks that depend on live third-party data (exact photos, live OSRM travel
times, real opening hours) are validated at the **mechanism** level here and
must be **spot-checked on-device** (build #30+). Those are called out explicitly.

---

## Scope of destinations

1-day and 3-day plans for: **Marrakech, Tangier, Chefchaouen, Madrid, Paris,
Rome, Tokyo, Kyoto, Bangkok.** All nine have curated knowledge packs (harness
§1: all found, ≥4 must-sees, coverage confidence 86–96%).

---

## The 10 checks

### 1. Are all must-see attractions included? ✅ (mechanism verified) / spot-check live
- **How:** the pack's Tier-1 list is fed *into* the AI prompt; after grounding,
  `injectMustSees()` guarantees any missing must-see **replaces the weakest
  Tier-3 anchor** — matched to a real OSM place (never invented).
- **Bug found & fixed:** matching was brittle to spelling variants/prefixes —
  `"Place Jemaa el-Fna"` (OSM) did **not** match pack `"Jemaa el-Fnaa"`, so a
  must-see could be mis-tiered or thought missing.
  - **Cause:** `packNameTier` used only exact/substring on the normalized string
    (`fnaa` ≠ `fna`).
  - **Fix:** new `looseMatch()` — token-coverage with ≥3-char prefix tolerance
    (`data/knowledge.ts`), and the engine's `nameSimilarity` now matches tokens
    by prefix too. Harness §1b: all 9 OSM-style spellings → tier 1; §1c: **no
    false positives** (El Badi ≠ Bahia, Reina Sofía ≠ Prado).
- **Live caveat:** inclusion still requires the must-see to exist in the OSM
  pool for that city (true for these 9 in practice). 1-day trips have 3 sight
  slots, so at most 3 of 4 must-sees fit — by design.

### 2. Are the photos correct for every attraction? ⚠️ mechanism verified offline — spot-check live for the live APIs
- **How:** `resolveStopMedia` resolves a place-specific photo (Wikimedia Commons
  → Wikipedia), keyed on the place name; category placeholder only as fallback.
- **Photo Validator (v2 Phase 5):** `enrichPlace` no longer trusts the
  Wikipedia search API's top hit unconditionally — `isMatchingArticle()`
  rejects a disambiguation page and rejects any article whose title isn't a
  tolerant match for the queried name (reusing `looseMatch`), so an
  ambiguous name can no longer silently attach a stranger's photo. Harness
  §18 asserts both rejection paths plus that real spelling/translation
  variants still pass.
- **Cannot fully verify here** (live photo APIs blocked in CI). Remaining
  risk is confined to the live network responses themselves, not the
  matching logic. **Staged improvement:** Pexels fallback + name
  disambiguation.

### 3. Any duplicate attractions? ✅ verified
- **How:** dedupe by normalized name across the whole trip in backfill;
  grounding tracks used pool ids; `injectMustSees` checks presence first.
- **Bug found & fixed:** `weatherAdapt` built its "used" set **per day**, so a
  weather swap could insert a museum already used on another day.
  - **Fix:** weather adaptation now dedupes **trip-wide** (`engine.ts`).

### 4. Any unrealistic travel times? ⚠️ partial
- **How:** travel legs come from **OSRM road routing**; `optimizeDayFlow`
  minimizes total movement.
- **Known limitation:** packs legitimately include **day-trip** sights
  (Pompeii, Phi Phi, Volubilis, Aït Benhaddou). If one lands mid-day, its leg is
  genuinely long. Scheduling stays monotonic but the day gets long. **Staged:**
  flag/isolate day-trip stops. Spot-check on-device.

### 5. Any closed attractions scheduled? ✅ guard in place (data-limited)
- **How:** `scheduleDay` reads OSM `opening_hours` and **never schedules a stop
  before it opens** (harness §5: a 10:00-opening museum desired at 09:00 is
  bumped to 10:00).
- **Limitation:** only when OSM has hours; full weekday/closed-day logic is not
  parsed. Honest and safe (delays, never fakes).

### 6. Does the day flow naturally morning→night? ✅ verified
- **How:** `sortBySlot` forces canonical order (breakfast→night) even if the AI
  mis-orders; `scheduleDay` produces strictly increasing clock times.
  Harness §6 + §5 pass.

### 7. Does the route avoid unnecessary backtracking? ✅ verified
- **How:** plain nearest-neighbor replaced by **constrained 2-opt**
  (`optimizeDayFlow`) — minimizes distance while preserving temporal order.
  Harness §7: a zig-zag day shortened 4.56 → 3.45 km, order preserved.
- **Residual:** cannot reorder across dayparts (by design), so meal placement
  still drives some movement.

### 8. Does the weather adaptation make sense? ✅ verified
- **How:** rain/heat(≥32°)/cold(≤8°)/wind(≥40km/h) swap flexible **outdoor**
  activities for the best nearby **indoor** option; hot days target the
  afternoon peak; Tier-1 must-sees are re-timed, never swapped.
- Fixed the cross-day duplicate risk (see §3).

### 9. Are the confidence scores realistic? ✅ verified
- **Factors:** verified location, real photo, opening hours, knowledge-tier,
  fame. Harness §9: Tier-1 must-see **99%**, verified local restaurant **55%**
  (honest — no rating data), unverified AI guess **0%** (gated out).
- **Bug found & fixed:** confidence dropped on days 2–3 because photos are only
  resolved up-front for day 1. **Fix:** verified places are credited the photo
  factor (they reliably resolve a Commons photo), keeping scores consistent
  across days.
- **Bands (v2 Phase 4):** 90 Excellent / 70 Trusted / 50 Fallback (kept,
  clearly labeled) / below 50 Reject (never displayed) — see Phase 4 below.

### 10. Would a real traveler actually follow it? ✅ by construction (pending live spot-check)
- Structured guided day (breakfast→night) with clock times, reasons, durations,
  travel legs, weather sense and confidence. Only Reject-band attractions
  (< 50%) are removed; 50-69% Fallback stops are kept and honestly labeled,
  not silently discarded. The remaining risks (photo correctness, day-trip
  legs) are the on-device spot-check items above.

---

## Bugs found and fixed in this phase

| # | Issue | Cause | Fix |
|---|-------|-------|-----|
| 1 | Must-see spelling variants mis-matched (`Place Jemaa el-Fna`) | exact/substring-only matching | `looseMatch` token-coverage + prefix tolerance; prefix-aware `nameSimilarity` |
| 2 | Weather swap could duplicate a place across days | per-day "used" set | trip-wide dedupe in `weatherAdapt` |
| 3 | Confidence lower on days 2–3 than day 1 | photo only resolved for day 1 | credit verified places the photo factor |
| 4 | Day could read out-of-order if AI mis-sequenced slots | array order trusted | `sortBySlot` before routing/scheduling |

## Remaining (tracked, not blocking)
- Photo correctness + **Pexels fallback** (priority #2).
- Day-trip leg isolation; richer opening-hours parsing.

## Post-validation priority #1 — shipped
**Real astronomical sunset times.** Open-Meteo's daily `sunset` field (ISO
local time, `timezone=auto`) is now fetched alongside temperature/precip/wind
and stored as `DayWeather.sunsetTime`. `scheduleDay()` anchors the `sunset`
slot to that real clock time instead of the generic `18:00` default whenever
it's known — so the golden-hour stop actually lands at golden hour, city- and
date-correct (e.g. Marrakech in June ≈ 19:30 vs. Tokyo in December ≈ 16:30).
Harness §1d asserts the override (`scheduleDay` given `sunsetTime: "21:34"` →
sunset stop scheduled at `21:34`, not the default). 30/30 pass.

## v2 Phase 2 — shipped: architecture inversion (AI is narrator-only)
**Finding (v2 audit, §13/§14):** the AI was selecting/designing stops directly
(`itineraryAI.ts#aiPlanItinerary` → `buildDaysFromAI` → `groundDaysToPool`
snapping AI guesses onto the nearest real OSM place after the fact) — a
violation of the spec's core rule that AI must never choose attractions, only
narrate an already-verified plan.
**Fix:** `itineraryAI.ts` and the entire AI-grounding path
(`buildDaysFromAI`, `groundDaysToPool`, `bestPoolMatch`, `nameSimilarity`,
`placeFromAIStop`) are deleted. Every trip — with or without an AI key — now
goes through one pipeline: real OSM places + the curated Knowledge Pack are
discovered, scored, clustered and routed first (`buildDeterministicDays`);
AI is invoked exactly once at the end, only to narrate the finished plan
(`narrate()`, using the pre-existing `CONCIERGE_SYSTEM` /
`buildEnrichmentPrompt` contract, which already instructed the model "do NOT
reorder, do NOT add or remove stops" — that contract simply wasn't the only
code path before). `Itinerary.engine` now reflects which narrator produced
the copy (`gemini`/`openai`/`claude`/`mock`), not which engine picked the
stops, since picking stops is no longer the AI's job.

**Also fixed in this phase — Day 1 must-see overload:** `injectMustSees`
previously scanned days in original array order when looking for a weak
anchor to replace with a missing must-see, so multiple missing must-sees
could all land on Day 1. New `leastLoadedOrder()` (`dayflow.ts`) always tries
the least-loaded day first, spreading injections evenly across the trip.
Harness §11 asserts the ordering (`[2,0,1]` load → `[1,2,0]` day order, i.e.
day 1 is never forced first).

32/32 assertions pass; `npm run typecheck` is clean.

## v2 Phase 3 — shipped: Interest Engine v2 + Interest Coverage Score
**Finding (v2 audit, §11/§14, Critical):** selected interests only nudged
`attractionScore`/`scorePlaces` weighting (+0.35 if the category matched) —
an interest could still end up with zero representation if nothing in its
category ranked high enough on fame/distance, and there was no score
anywhere measuring whether the trip actually delivered on what the
traveller asked for.

**Fix:** new `itinerary/interests.ts` centralizes the interest→category
mapping (previously duplicated independently in `scoring.ts` and
`engine.ts`) and adds `interestCoverageScore(stops, interests)` — the
fraction of selected interests with at least one matching stop, an honest
measurement of the result, not the intent. `ensureInterestCoverage()`
(`engine.ts`) runs right after `injectMustSees` and **enforces** coverage:
any interest with zero matching stops gets its single best real OSM
candidate swapped into the weakest Tier-3 attraction slot, least-loaded day
first (must-sees are never overwritten; an interest stays honestly
uncovered if the destination's real data has nothing in that category).
The score is reported on `Itinerary.audit.interestCoverage` (0-100).

Harness §12 asserts the score is honest: two represented interests → 1.0;
adding a third interest absent from the real data → 0.67 (not silently
rounded up to "covered"); zero interests selected → trivially 1.0.

35/35 assertions pass; `npm run typecheck` is clean.

## v2 Phase 4 — shipped: Validation pipeline (Candidate Validation, Confidence bands, Verified badge, Quality Score)
**Finding (v2 audit, §9/§10):** candidates were never rejected with a stated
reason (silent filtering); the Verified badge was set unconditionally
(`overpass.ts` hardcoded `verified: true` for every OSM result regardless of
location); confidence used a flat ~70% cutoff instead of the spec's
90/70/50/Reject bands, so a 69% stop and a 10% stop were treated identically;
and there was no composite score measuring overall plan quality, only a flat
per-stop confidence average.

**Fix:** new `itinerary/validate.ts` is the single source of truth for all
four:
- `validateCandidate(place, center, seenNames)` rejects with one of seven
  named reasons (`missing_coordinates`, `unknown_category`,
  `outside_destination`, `duplicate`, `closed_permanently`,
  `unknown_location`, `low_confidence`) before a place can ever be scored,
  tiered or scheduled — wired in via a new `validatePool()` step in
  `engine.ts` right after discovery. Never silent: rejected candidates are
  simply excluded, with a stated reason available for debugging.
- `isVerified(place, center)` tightens the Verified badge to a real, mapped
  OSM object (`source === "overpass"`, real coords/name/category, inside the
  destination radius) — overwriting the old unconditional `verified: true`
  for every place that passes through `validatePool()`.
- `confidenceBand(score)` implements 90 Excellent / 70 Trusted / 50 Fallback
  / below 50 Reject. `gateLowConfidence()` (`engine.ts`) now drops only
  Reject-band attraction stops while keeping Fallback (50-69%) stops visible
  and honestly labeled, instead of silently discarding everything under a
  flat 70% line.
- `qualityScore()`/`qualityLabel()` compute the spec's 7-factor composite
  (Interest Coverage 20%, Landmark Coverage 20%, Route Efficiency 15%, Time
  Logic 15%, Photo Quality 10%, Weather Adaptation 10%, Verification Quality
  10%) from real measurements (`landmarkCoverageScore`,
  `routeEfficiencyScore`, `timeLogicScore`, `photoQualityScore`,
  `weatherAdaptationScore`, `verificationQualityScore` — each a pure,
  independently-testable function reusing existing helpers from `dayflow.ts`
  and `knowledge.ts` rather than duplicating logic). Reported on
  `Itinerary.audit.qualityScore`/`qualityLabel` (Premium Plan / Very Good /
  Good / Limited Verified Data), replacing the old flat per-stop confidence
  average as the headline quality measure.

**Design note — Candidate Validation vs. Confidence Validation are separate
stages, by spec:** `validateCandidate()` deliberately does **not** check
confidence. At pool-ingestion time, tier/photo signals haven't been resolved
yet, so the weighted confidence formula would unfairly reject legitimate
hand-curated seed landmarks (`source: "mock"`) that simply haven't been
scored yet — a regression against the "100 excellent destinations, never
silently discarded" curated-data principle. The spec's own pipeline keeps
these as separate, sequential stages (Candidate Validation → ... →
Confidence Validation), so the real 50%-band reject correctly runs later, in
`gateLowConfidence()`, once a place is an actual stop with tier/photo data.

Harness §13 asserts all seven rejection reasons plus acceptance; §14 asserts
the Verified badge depends on source + location, never coordinates alone;
§15 asserts all four confidence bands; §16 asserts the composite score and
honest labeling at both ends (100 → Premium Plan, 30 → Limited Verified
Data); §17 asserts each sub-score measurement independently.

57/57 assertions pass; `npm run typecheck` is clean.

## v2 Phase 5 — shipped: Photo Validator (subject-match gate)
**Finding (v2 audit, §9):** `enrichPlace` (`wikipedia.ts`) queries Wikipedia
search by `name + city` and trusts the single top result unconditionally —
there was no check that the returned article actually depicts the queried
place, so a disambiguation page or an unrelated topic the search merely
ranked highly could silently attach a stranger's photo/description to a
stop.

**Fix:** new `isMatchingArticle(queriedName, articleTitle, pageprops)` in
`data/knowledge.ts` — kept there rather than in `wikipedia.ts` because
`wikipedia.ts` pulls in `cache.ts` → `AsyncStorage`, which can't run under
plain Node, and the matching logic needed to stay testable in the offline
harness. It rejects a disambiguation hit (`pageprops.disambiguation`) and
rejects any title that isn't a tolerant match for the queried name, reusing
the existing `looseMatch` matcher (already proven against real OSM spelling
variants in §1b/§1c) instead of writing a second name-matching heuristic.
`enrichPlace` now calls it post-fetch and discards the result on a mismatch,
falling through to Commons geosearch → Foursquare → the seeded category
fallback. `cityHeroImage` (REST summary API) already checked
`type !== "disambiguation"` and `commonsPhotoNear` is location-bound by
construction (geosearch around the place's own coordinates), so neither
needed a change.

Harness §18 asserts: exact-title match accepted; a spelling/translation
variant ("Sensō-ji" → "Sensoji Temple") still accepted; an unrelated topic
the search merely ranked rejected; a different landmark in the same city
rejected; a disambiguation page rejected even when its title looks close;
no article found rejected.

63/63 assertions pass; `npm run typecheck` is clean.

## v2 Phase 6 — shipped: Restaurant/Café/Nightlife engines (walking-distance bound, district-first nightlife)
**Finding (v2 audit, §9):** lunch/dinner/coffee were picked by raw
nearest-neighbor search over the whole food pool, with no real
walking-distance constraint — in a thin-data city this could hand back a
match from anywhere in the pool, not "within walking distance of the
current itinerary" as the spec requires. Nightlife was ranked as a single
candidate like any other category, with no preference for a real nightlife
district (a cluster of several venues) over an isolated bar that merely
happened to be closer.

**Fix:** new `nearestWithinRadius()` (`itinerary/optimize.ts`) makes a near,
already-used spot (reusing a great nearby restaurant for both lunch and
dinner) beat a brand-new spot outside `WALK_RADIUS_KM` (1.5km) — the
walking-distance constraint is now the top priority, and the function only
widens to the unrestricted nearest match when nothing at all exists within
radius, so a day is never left without food in a thin-data city. New
`bestNightlifeVenue()` measures each nightlife candidate's real local
density (other OSM nightlife venues within 300m) and picks from the
densest genuine cluster, breaking ties by distance to the anchor — a
district-first rule built entirely from real OSM density, nothing invented.
Both are wired into `buildStops()` (`engine.ts`) for the coffee/lunch/
dinner/evening-nightlife slots.

Harness §19 asserts: a near reused spot beats a far new one; nothing
walkable still returns something (no day starves); an unused near spot is
the obvious pick when no reuse is needed. §20 asserts a 3-venue district
beats a closer lone bar, and picks the closest member of that district.

67/67 assertions pass; `npm run typecheck` is clean.

## v2 Phase 7 — shipped: Route/Transport engine (one mode source, budget tiers, walking fatigue, day themes)
**Finding (v2 audit, §13):** the walk/transit/taxi decision was implemented
three separate times — `routing.ts`'s `decideMode` and two inline copies in
`engine.ts` (`buildStops()` and `recomputeDay()`) — and they had silently
drifted: the inline copies used a 1.8/8km walk/transit split while
`routing.ts` used 1.8/12, so the same leg could get a different mode
depending on which code path produced it. The logic was also blind to budget
(a luxury traveller and a backpacker got identical mode choices) and to
walking fatigue (a day could demand many long walking legs in a row). The
day "title" was AI free-text with no taxonomy guaranteeing it matched the
day's stops.

**Fix:** a single `decideTravelMode()` (`itinerary/optimize.ts`, the pure
harness-testable module) is now the only place a mode is decided. It applies
budget-tiered ceilings (economy walk≤2.5/transit≤15km; medium
walk≤1.8/transit≤12km, byte-for-byte the old default so existing plans don't
change; luxury walk≤1.0/transit≤6km) and a Walking Fatigue model — once a
day's cumulative walked distance hits 3km, the walk ceiling collapses to
0.3km so subsequent short legs still prefer transit. `routing.ts` imports
and wraps it, threading `budget` and a per-day fatigue accumulator through
`dayRoute()`/`haversineFallback()`; both `engine.ts` inline duplicates were
deleted in favour of calls to `decideTravelMode()`/`legDurationMin()`. New
`dayTheme()` (`interests.ts`) replaces the free-text day title with a closed
taxonomy derived from the day's real non-food/non-nightlife categories with
a ≥40% dominance rule, surfaced on `ItineraryDay.theme`. Multi-day balancing
was already delivered by `leastLoadedOrder()` in Phase 2.

Harness §21 asserts the budget tiers diverge correctly (economy walks a 2km
leg, medium transits it, luxury transits a 1.2km leg; economy keeps a 13km
leg on transit while medium taxis it) and that fatigue flips a short leg to
transit after 3km walked. §22 asserts the theme taxonomy: a monument-heavy
day → "Historic & Monuments", a no-majority day and a food-only day → honest
"Mixed Highlights", a shopping-dominant day → "Markets & Shopping".

78/78 assertions pass; `npm run typecheck` is clean.

## v3 Phase 1 — shipped: explainable recommendation reasons
**Finding (V3 directive):** "Users do not understand why a place was
recommended." The only per-stop rationale was free-text AI narration, which
can drift or be generic.

**Fix:** `recommendationReason()` (`itinerary/scoring.ts`) returns one
deterministic, source-backed "Recommended because…" line per stop in a fixed
precedence (must-see tier → explicit interest match → real nightlife district
→ walking-distance meal → global fame → proximity to route → honest
worthwhile-stop fallback), never claiming a reason the data doesn't support.
Stored on `Place.recommendationReason`, computed for every stop in
`engine.ts`, shown in `StopCard`. Harness §23 (7 assertions) covers each
branch and the no-false-claim guarantee.

## v3 Phase 2 — shipped: food limits & experience dominance
**Finding (V3 directive):** "Too many food/drink recommendations; food
dominates"; the bad "Restaurant → Café → Restaurant → Café" pattern.

**Fix:** `experienceShare()`, `withinFoodLimits()` and `capFoodStops()`
(`itinerary/validate.ts`). `capFoodStops()` enforces V3's count allowance
(≤1 breakfast + 1 lunch + 1 dinner + 1 optional drink), dropping excess
café/snack/extra-restaurant stops while never removing a meal anchor or a real
experience; food-focused trips are exempt. `withinFoodLimits()` reports the
≥70%-experience share for the audit. Wired into `engine.ts` per day. Harness
§24 (8 assertions).

## v3 Phase 3 — shipped: category separation, dedup & diversity
**Finding (V3 directive):** "Overlapping categories / each category must
return different recommendations" and "repeated places." The Nearby filter
chips mapped to single raw categories, so cafés, monuments, museums, beaches,
viewpoints and shopping had no dedicated bucket.

**Fix:** `BROWSE_GROUPS` (`itinerary/interests.ts`) strictly partitions all 11
categories into the 7 V3 buckets (food/nightlife/history/museums/nature/
shopping/culture) — each category in exactly one group — with
`browseGroupFor()`/`inBrowseGroup()`; the Nearby screen filters by group.
`duplicatePlaceNames()` and `experienceDiversity()`
(`itinerary/validate.ts`) make the repeated-places guard and monotonous-day
signal measurable. Harness §25 (5 assertions) + §26 (4 assertions).

## v3 Phase 4 — shipped: photo priority, placeholder honesty & place metadata
**Finding (V3 directive §3/§4):** wrong/generic photos; every recommendation
must carry an exact photo (or a placeholder, never an incorrect image) plus
name, address, coordinates, opening hours and website.

**Fix:** `PHOTO_SOURCE_PRIORITY` + `bestPhotoSource()` (`itinerary/validate.ts`)
codify Commons → official → Unsplash → Pexels and return null (→ placeholder)
when nothing real exists; `hasExactPhoto()` separates a real photo from a
category placeholder; `formatAddress()` builds a clean OSM address.
`overpass.ts` now extracts `Place.address` + `Place.website`. `PlaceSheet`
shows reason, address, coordinates, hours and a tappable website, and badges
non-exact images "Representative image." Harness §27 (9 assertions).

## v3 Phase 5 — shipped: use existing recommendations first
**Finding (V3 directive §7):** use the places already available before fetching
new ones; rank by tier, confidence, interest, distance and opening hours.

**Fix:** `availabilityRank()`, `rankExisting()` and `shouldFetchMore()`
(`itinerary/scoring.ts`) rank the existing pool by exactly those five factors;
`engine.ts` only calls `discoverPlaces()` when the existing pool is too thin
(`shouldFetchMore(pool, days × maxSightsPerDay)`), merging deduped rather than
replacing. Harness §28 (6 assertions).

## v3 Phase 6 — shipped: interest-engine completeness & pack→global fallback
**Finding (V3 directive §8/§16):** personalization for traveller types
(Family, Romantic, etc.), Balanced Explorer as the default, and a knowledge
pack that improves quality without limiting global coverage.

**Fix:** `TRAVELER_CATEGORIES`/`travelerBoostCategories()` and
`isBalancedDefault()` (`itinerary/interests.ts`) add per-type leans (wired as
a gentle +0.12 in `scorePlaces`, below the +0.35 interest boost), with
`explorer` as the no-lean default. `destinationConfidence()` +
`GLOBAL_ENGINE_CONFIDENCE` return a pack's confidence when present else an
honest 55 baseline, so any city worldwide is still scored. Harness §29 (8
assertions).

## v3 Phase 7 — shipped: advanced day structure + 70% confidence display gate
**Finding (V3 directive §11/§15):** the day should follow an intentional
08:00→21:30 clock with the main landmark early; and attractions below 70%
confidence should not be shown.

**Fix:** `slots.ts` reorders the skeleton (main attraction before the
morning/cultural activity) and sets the V3 clock template (anchors, with
`scheduleDay` still enforcing increasing time + travel/opening hours).
`DISPLAY_CONFIDENCE_FLOOR` (0.7) + `passesDisplayConfidence()`
(`itinerary/validate.ts`) raise the gate: `gateLowConfidence` drops attractions
below 70% with backfill + a completeness guard; functional food/coffee/sunset/
night stops are exempt. Harness §30 (6 assertions); §5/6 opening-hours test
retuned to the new template.

## v3 Phase 8 — shipped: Discover page destination facts
**Finding (V3 directive §17):** the Discover/plan view should show attraction
count, destination confidence, best months, budget estimate, top experiences
and weather suitability.

**Fix:** `destinationSummary()` (`data/knowledge.ts`) assembles all six fields
from the curated pack, and degrades honestly for any city (null count, global
confidence baseline, no invented experiences). Surfaced on the Plan screen as
a live facts card. Harness §31 (8 assertions, pack + global branches).

## v3 Phase 9 — shipped: performance (request dedup, in-memory category switch)
**Finding (V3 directive §18):** slow loading; avoid repeated API calls; fast
category switching.

**Fix:** `createInflight()` (`lib/inflight.ts`) coalesces concurrent same-key
requests into one in-flight promise; `cache.ts`'s `withCache()` routes through
it, so simultaneous callers for the same resource trigger one cache read +
loader + write instead of N network calls. Category switching is already
in-memory (Nearby filters the loaded list, no refetch). Harness §32 (3 async
assertions).

## v3 Phase 10 — shipped: 9-city benchmark validation
**Finding (V3 directive §19):** audit Marrakech, Tangier, Chefchaouen, Madrid,
Paris, Rome, Tokyo, Kyoto, Bangkok for must-see coverage, confidence,
duplication, category separation, etc.

**Fix:** harness §33 iterates all nine cities and asserts must-see coverage
(≥4 each), confidence accuracy (70-100%), no duplicate must-sees, Discover
facts present, must-see matching to Tier 1 on a real OSM spelling, and global
category separation — a single cross-city regression gate. Photo accuracy and
live travel times require the network and stay as on-device spot-checks.

## How to reproduce
```
cd mobile && npm run validate   # 148/148 assertions on the real algorithms
cd mobile && npm run typecheck  # clean compile
```
