# TravelMate V3 — Recommendation & Itinerary Engine Audit

This document maps the **V3 quality directive** onto the codebase as it stands
after the V2 work (Phases 2–7, all shipped), states honestly what is already
done, what is partial, and what is a genuine gap, and defines the V3 execution
plan. It follows the same discipline as `TravelMate_V2_Audit.md`: each phase
ships pure, offline-testable logic with new assertions in
`mobile/scripts/validate-itinerary.cjs`, run via `npm run validate`, and
updates the governing docs before committing.

The V3 directive's own rule governs everything below: **STOP adding cosmetic
features. Focus on recommendation quality, itinerary quality, destination
expertise, data quality and performance.** AI never invents attractions,
coordinates, photos, hours, ratings or reviews — it only organizes, ranks,
personalizes, explains and optimizes.

---

## 1. Demand → current state → plan

| V3 demand | Current state | V3 action |
|---|---|---|
| **Wrong/generic photos** | Photo subject-match gate shipped (V2 Phase 5, `isMatchingArticle`); Commons→site→Unsplash→Pexels order exists in `media.ts` | **Phase V3-4:** explicit placeholder-vs-generic policy (never show an incorrect/generic city photo for a specific place — fall back to a category placeholder) + assert the source priority order |
| **Users don't understand why a place was recommended** | Only free-text AI `note`; no structured, deterministic reason | **Phase V3-1 (this phase):** `recommendationReason()` — a deterministic "Recommended because…" per stop |
| **Too many food/drink; food dominates** | Day shape caps meals structurally (1 coffee + 1 lunch + 1 dinner) but no explicit ≥70%-experiences guarantee or food-trip exception | **Phase V3-2:** food-limit + experience-dominance enforcement, measurable |
| **Overlapping categories / category separation** | `INTEREST_CATEGORIES` taxonomy exists; no explicit per-bucket separation or diversity check | **Phase V3-3:** category-separation map + day diversity check |
| **Repeated places** | `usedFood`/`usedExtra` sets + `validateCandidate` duplicate check (per-name) | **Phase V3-3:** extend dedup to a cross-day guarantee + assert it |
| **Poor personalization / Balanced Explorer default** | Interest Engine v2 shipped (V2 Phase 3); `mode` defaults exist | **Phase V3-3:** confirm Balanced-Explorer default behavior + reasons reflect it |
| **Weak itinerary quality / experience-based day** | Fixed guided-day slots (`slots.ts`), 2-opt flow, real routing, day themes (V2 Phase 7) | Largely done; reinforced by V3-1/2/3 |
| **Slow loading / nearby / category switch** | Per-source caching via `cache.ts`; parallel fetch in `engine.ts` | **Phase V3-5:** request dedup, prefetch, parallelize AI/Overpass (was V2 Phase 9) |
| **Confidence < 70% not shown** | Reject band (<50%) gated; bands 90/70/50 shipped (V2 Phase 4) | Aligns; revisit the display threshold in UI phase |
| **Must-see enforcement / weather re-timing / route N-C-S** | Shipped (V2 Phases 2, 7 + weather adapt) | Done |
| **Validation across 9 benchmark cities** | Offline harness, 78 assertions | **Phase V3-6:** expand harness to the 9 named destinations end-to-end |

---

## 1b. Full prompt coverage — every section accounted for

Every section of the V3 directive, so nothing is skipped:

1. **Core philosophy** (local-expert feel) — guiding goal of all phases.
2. **AI responsibility** (never invent; only organize/rank/personalize/explain/optimize) — enforced since V2 P2 (data-first, AI narrates last).
3. **Data sources** (OSM/Wikidata/Wikipedia, Open-Meteo, OSRM; photos Commons→official→Unsplash→Pexels) — sources in place; photo priority codified in **V3-4**.
4. **Photo system** (exact photo + name + address + coords + hours + website; placeholder if none; never wrong/generic) — **V3-4**.
5. **Recommendation explanation** — **V3-1 ✅**.
6. **Category separation** (7 distinct buckets, diversity checks) — **V3-3 ✅**.
7. **Use existing recommendations first** (rank by tier/confidence/interest/distance/hours; fetch only when needed) — **V3-5**.
8. **User interest engine** (per-interest priorities; Balanced Explorer default; Family, Romantic, Photography) — **V3-6**.
9. **Itinerary redesign** (experience-based day, not a food list) — V2 slots + **V3-2 ✅** (food cap) + **V3-7** (day-structure clock template).
10. **Food limits** (≤1 bf/lunch/dinner + 1 drink; experiences ≥70%) — **V3-2 ✅**.
11. **Advanced day structure** (08:00→21:30 intentional clock) — **V3-7**.
12. **Must-see enforcement** (Tier 1 always) — V2 P2/P3 ✅.
13. **Weather-aware planning** (indoor swaps; must-sees re-timed) — V2 weather-adapt ✅.
14. **Route optimization** (N-C-S, minimize travel) — V2 P2 (2-opt) + P7 ✅.
15. **Confidence system** (score + source + reason; below 70% not shown) — bands V2 P4; the **70% display gate** for attractions in **V3-7**.
16. **Knowledge packs** (premium layer; pack→high-confidence, else global engine; any city) — verify + assert in **V3-6**.
17. **Discover page** (count, confidence, best months, budget, top experiences, weather suitability) — **V3-8**.
18. **Performance** (<3s dest / <2s nearby / <1s category; cache/prefetch/dedup) — **V3-9**.
19. **Validation phase** (9 cities: must-see, photo, confidence, route, travel, weather, dedup, category) — **V3-10**.
20. **Final goal** (real·verified·optimized·personalized·explainable·accurate) — the bar all phases are measured against.

## 2. Execution plan

| Phase | Scope | Files |
|---|---|---|
| **V3-1** | **Recommendation Reason Engine** — deterministic "Recommended because…" per stop | `scoring.ts`, `types.ts`, `engine.ts` ✅ |
| **V3-2** | Food limits + ≥70% experience dominance (food-trip exempt), measurable | `validate.ts`, `engine.ts` ✅ |
| **V3-3** | Category separation partition + diversity & dedup checks | `interests.ts`, `validate.ts`, `nearby.tsx` ✅ |
| **V3-4** | Photo source-priority + placeholder policy (never wrong/generic) + place metadata (address/website/coords/hours) | `validate.ts`, `overpass.ts`, `media.ts`, `types.ts`, `PlaceSheet.tsx` |
| V3-5 | Use-existing-first ranking (tier/confidence/interest/distance/hours before any fetch) | `scoring.ts`, `engine.ts` |
| V3-6 | Interest engine completeness: Balanced-Explorer default, Family/Romantic/Photography priorities; pack→global fallback assertions | `interests.ts`, `engine.ts`, `knowledge.ts` |
| V3-7 | Advanced day-structure clock template + 70% confidence display gate for attractions | `slots.ts`/`dayflow.ts`, `validate.ts` |
| V3-8 | Discover page data (count, confidence, best months, budget, top experiences, weather suitability) | `knowledge.ts`, discover screen |
| V3-9 | Performance: request dedup, prefetch, parallel Overpass/AI, structured logging | `cache.ts`, `overpass.ts`, `engine.ts` |
| V3-10 | Benchmark validation across the 9 named destinations | `scripts/validate-itinerary.cjs` |

**Standing rule (unchanged):** after each phase — compile, run tests, fix
regressions, update docs, commit, only then continue.

---

> **Phase V3-1 status: shipped.** The loudest V3 complaint — "Users do not
> understand why a place was recommended" — is fixed with a deterministic,
> source-backed reason per stop, not AI free-text. New
> `recommendationReason()` (`itinerary/scoring.ts`, the pure harness-tested
> module) produces a single honest "Recommended because…" line from real
> signals in a fixed precedence: must-see tier → explicit interest match →
> real nightlife district (V2 Phase 6 density signal) → walking-distance meal
> → global fame → proximity to the route → a plain worthwhile-stop fallback.
> It never claims a reason the data doesn't support (e.g. it only says
> "matches your interest in X" when the place's category actually satisfies a
> selected interest). Surfaced on the new `Place.recommendationReason` field,
> computed for every stop in `engine.ts`. New harness §23 (7 assertions)
> covers each precedence branch and the no-false-claim guarantee. 85/85
> offline assertions pass; `npm run typecheck` is clean. Phases V3-2…V3-6
> remain open.

---

> **Phase V3-2 status: shipped.** The "too many food/drink recommendations;
> food dominates" complaint is fixed with a real, measurable guard. New pure
> functions in `itinerary/validate.ts`: `experienceShare()` (0..1 of a day's
> stops that are real experiences, not food/drink — nightlife counts as a
> night experience, not a meal), `withinFoodLimits()` (the ≥70%-experience
> measurement, surfaced for the audit), and `capFoodStops()` which enforces
> V3's count allowance — at most 1 breakfast, 1 lunch, 1 dinner and 1 optional
> drink, dropping any excess café/snack/extra restaurant while never removing
> a meal anchor or a real experience, so the "Restaurant → Café → Restaurant →
> Café" pattern can't occur. Food-focused trips (the traveller selected food,
> or a food-lover profile) are exempt. Wired into `engine.ts`: each built day
> is passed through `capFoodStops(built, foodFocused)` before scheduling. The
> count allowance is always achievable; the stricter share is a measurement we
> never chase by deleting a traveller's lunch. New harness §24 (8 assertions).
> 93/93 offline assertions pass; `npm run typecheck` is clean. Phases
> V3-3…V3-6 remain open.

---

> **Phase V3-3 status: shipped.** The "overlapping categories / each category
> must return different recommendations" and "repeated places" complaints are
> fixed. The Nearby category filter was the concrete bug: its chips mapped to
> single raw categories (`restaurant`, `attraction`, `park`), so cafés,
> monuments, museums, beaches, viewpoints and shopping never appeared under a
> dedicated category — they were reachable only under "All". New
> `BROWSE_GROUPS` (`itinerary/interests.ts`) is a strict PARTITION of all 11
> place categories into the seven V3 browse buckets (food, nightlife, history,
> museums, nature, shopping, culture) — each category in exactly one group, no
> overlap, nothing hidden — with `browseGroupFor()`/`inBrowseGroup()` helpers,
> kept deliberately separate from the (intentionally overlapping)
> `INTEREST_CATEGORIES` scoring map. The Nearby screen now filters by group.
> New `duplicatePlaceNames()` and `experienceDiversity()`
> (`itinerary/validate.ts`) make the repeated-places guard and a
> monotonous-day signal measurable. New harness §25 (5 assertions, partition
> completeness/disjointness) and §26 (4 assertions, dedup + diversity).
> 102/102 offline assertions pass; `npm run typecheck` is clean. Phases
> V3-4…V3-6 remain open.

---

> **Phase V3-4 status: shipped.** The photo + place-metadata requirements
> (§3, §4) are addressed. New pure helpers in `itinerary/validate.ts`:
> `PHOTO_SOURCE_PRIORITY` + `bestPhotoSource()` codify the exact V3 order
> (Wikimedia Commons → official website → Unsplash → Pexels) and return null
> when no real source exists — the signal to show a category PLACEHOLDER, never
> a generic city photo or an unrelated image; `hasExactPhoto()` distinguishes a
> real, subject-matched photo from a placeholder; `formatAddress()` assembles a
> clean display address from OSM `addr:*` parts (no stray commas). `overpass.ts`
> now extracts `address` (from `addr:housenumber/street/city`) and `website`
> (from `website`/`contact:website`) into the new `Place.address`/
> `Place.website` fields. `PlaceSheet` now shows the recommendation reason, the
> address, exact coordinates, opening hours and a tappable official-website
> link, and honestly badges a non-exact image "Representative image" rather
> than implying it's the real thing. New harness §27 (9 assertions). 111/111
> offline assertions pass; `npm run typecheck` is clean. Phases V3-5…V3-10
> remain open.

---

> **Phase V3-5 status: shipped.** The "use existing recommendations first;
> only fetch when necessary" rule (§7) is now explicit and ranked by exactly
> the five factors the directive names. New pure functions in
> `itinerary/scoring.ts`: `availabilityRank()` scores an already-loaded
> candidate on Tier (0.4) + Confidence (0.3) + Interest match (0.15) +
> Opening-hours-on-file (0.05) + Proximity (0.1); `rankExisting()` orders the
> existing pool best-first with it; `shouldFetchMore()` decides whether the
> existing pool is genuinely too thin for the requested trip (counting only
> usable candidates) before any network call. `engine.ts` now builds from the
> already-loaded pool and only calls `discoverPlaces()` when
> `shouldFetchMore(pool, days × maxSightsPerDay)` is true, merging new results
> (deduped) rather than replacing — so the app exhausts what it already has
> first. New harness §28 (6 assertions). 117/117 offline assertions pass;
> `npm run typecheck` is clean. Phases V3-6…V3-10 remain open.

---

> **Phase V3-6 status: shipped.** The interest-engine completeness (§8) and
> the knowledge-pack→global fallback (§16) are done. New in
> `itinerary/interests.ts`: `TRAVELER_CATEGORIES` + `travelerBoostCategories()`
> add the per-traveller-type personalization explicit interests don't capture
> (Family → parks & kid-friendly attractions; Romantic couples → sunset
> viewpoints + evening dining; Luxury/Backpacker/Digital-nomad/Solo each lean
> their own way; `explorer` is the no-lean Balanced Explorer). `engine.ts`'s
> `scorePlaces()` now applies a gentle traveller-type lean (+0.12) below the
> dominant explicit-interest boost (+0.35). `isBalancedDefault()` recognizes
> the default posture — no interests, no lean — so a Balanced Explorer gets an
> even mix. For §16, `destinationConfidence()` + `GLOBAL_ENGINE_CONFIDENCE`
> return a curated pack's confidence when present (the premium layer) else an
> honest 55 baseline, reported for any city — packs improve quality but never
> gate global coverage. New harness §29 (8 assertions). 125/125 offline
> assertions pass; `npm run typecheck` is clean. Phases V3-7…V3-10 remain open.

---

> **Phase V3-7 status: shipped.** The advanced day structure (§11) and the
> 70% confidence display gate (§15) are done. `slots.ts` now lays the day out
> on the V3 clock — 08:00 breakfast, 09:00 main landmark (moved early, before
> the cultural/morning activity), 11:00 cultural attraction, 13:00 lunch, 14:30
> neighborhood, 16:30 activity, 18:30 sunset, 20:00 dinner, 21:30 night — and
> the `SLOTS` order now matches (main attraction before morning activity), so
> the schedule reads like a real local-expert day; `scheduleDay()` still treats
> these as desired anchors and enforces increasing time + real travel/opening
> hours. For §15, new `DISPLAY_CONFIDENCE_FLOOR` (0.7) +
> `passesDisplayConfidence()` (`validate.ts`) raise the bar: `gateLowConfidence`
> now drops ATTRACTION stops below 70% (not just the <50% reject band), with
> backfill refilling stronger picks and the completeness guard (≥3 stops + a
> main attraction) preventing an emptied day. Meals/coffee/sunset/night are
> exempt — functional, no ratings source, kept and labeled. New harness §30 (6
> assertions); the existing opening-hours test was retuned to the new template.
> 131/131 offline assertions pass; `npm run typecheck` is clean. Phases
> V3-8…V3-10 remain open.
