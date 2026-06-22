# TravelMate v2 — Repository Audit (Phase 1)

_Per the v2 Master Specification's execution rules: no code was changed to
produce this report. It is a white-box audit of the actual code in
`mobile/src/lib/itinerary/`, `mobile/src/lib/ai/`, and `mobile/src/lib/data/`,
measured against the v2 spec's required pipeline, tier system, interest
engine, validation pipeline, photo engine, and Definition of Done._

> **Phase 2 status: shipped.** The §13/§14 "highest risk / highest value"
> finding — AI selecting stops directly (`itineraryAI.ts` → `buildDaysFromAI`
> → `groundDaysToPool`) instead of only narrating an already-built plan — has
> been fixed. `itineraryAI.ts`, `buildDaysFromAI`, `groundDaysToPool` and the
> whole AI-grounding code path are deleted. Every itinerary now goes through
> the single deterministic pipeline (`buildDeterministicDays`: discover →
> score → cluster → route from real OSM/pack data only), and AI is invoked
> exactly once, at the end, strictly to narrate (`narrate()` in `engine.ts`,
> using the existing `CONCIERGE_SYSTEM`/`buildEnrichmentPrompt` contract that
> already forbade reordering/adding/removing stops). `Itinerary.engine`
> now reports which narrator actually ran (`gemini`/`openai`/`claude`/`mock`)
> instead of which engine *planned* the trip. The §13 "Day 1 overload" bug in
> `injectMustSees` is also fixed: a new `leastLoadedOrder()` helper
> (`dayflow.ts`) spreads must-see injections across the least-loaded day
> first instead of always scanning day 1 first. 32/32 offline assertions
> pass (`npm run validate`); `npm run typecheck` is clean. See
> `VALIDATION.md` for the updated report.

> **Phase 3 status: shipped.** The §11/§14 "Critical" finding — interests
> only nudged scoring weighting, with no enforcement and **no Interest
> Coverage Score anywhere** — is fixed. New `itinerary/interests.ts` is the
> single source of truth for the interest→category mapping (collapsing the
> duplicate copies that previously lived separately in `scoring.ts` and
> `engine.ts`, flagged in §4), and adds `interestCoverageScore()`: an honest
> 0..1 measurement of how many of the traveller's selected interests are
> actually represented in the *finished* trip — not intent, the result. New
> `ensureInterestCoverage()` in `engine.ts` runs right after `injectMustSees`
> and *enforces* coverage on the built plan: any selected interest with zero
> matching stops trip-wide gets its single best real OSM candidate swapped
> into the weakest Tier-3 (non-must-see) attraction slot, least-loaded day
> first — must-sees are never overwritten, and an interest is left honestly
> uncovered only when the destination's real data has nothing in that
> category (never invented). The score is now reported on
> `Itinerary.audit.interestCoverage` (0-100). 35/35 offline assertions pass;
> `npm run typecheck` is clean.

> **Phase 4 status: shipped.** The §9/§10 "Validation pipeline" finding —
> candidates were never rejected with a stated reason, the Verified badge
> was set unconditionally in `overpass.ts`, confidence used a flat ~70%
> cutoff instead of the spec's 90/70/50/Reject bands, and there was no
> composite Quality Score — is fixed. New `itinerary/validate.ts` is the
> single source of truth for all four: `validateCandidate()` rejects a
> place with one of seven named reasons (`missing_coordinates`,
> `unknown_category`, `outside_destination`, `duplicate`,
> `closed_permanently`, `unknown_location`, `low_confidence`) before it can
> ever be scored, tiered or scheduled — wired in via a new `validatePool()`
> step in `engine.ts` that runs right after discovery; `isVerified()`
> tightens the Verified badge to a real, mapped OSM object (source
> `"overpass"`, real coords/name/category, inside the destination radius),
> overwriting the old unconditional `verified: true`; `confidenceBand()`
> implements the 90 Excellent / 70 Trusted / 50 Fallback / below Reject
> bands, and `gateLowConfidence()` now drops only Reject-band attraction
> stops while keeping 50-69% "Fallback" stops visible and honestly labeled
> instead of silently discarding them at a flat 70% line; and
> `qualityScore()`/`qualityLabel()` compute the spec's 7-factor composite
> (Interest Coverage 20%, Landmark Coverage 20%, Route Efficiency 15%, Time
> Logic 15%, Photo Quality 10%, Weather Adaptation 10%, Verification
> Quality 10%) from real measurements (`landmarkCoverageScore`,
> `routeEfficiencyScore`, `timeLogicScore`, `photoQualityScore`,
> `weatherAdaptationScore`, `verificationQualityScore`), reported on
> `Itinerary.audit.qualityScore`/`qualityLabel` (Premium Plan / Very Good /
> Good / Limited Verified Data) — replacing the old flat per-stop
> confidence average as the headline quality measure. 57/57 offline
> assertions pass; `npm run typecheck` is clean. Phases 5-12 remain open.

---

## 1. Repository Overview

```
mobile/src/lib/
 ├─ itinerary/
 │   engine.ts       orchestrator (generateItinerary, ~1060 lines)
 │   dayflow.ts       pure: sortBySlot, optimizeDayFlow (2-opt), scheduleDay
 │   slots.ts          pure: GuideSlot constants/order
 │   scoring.ts        attractionScore, selectionValue, confidenceScore, gemConfidence
 │   optimize.ts       nearest-neighbor route, day clustering (deterministic fallback only)
 │   budget.ts         per-category cost table
 ├─ ai/
 │   itineraryAI.ts    Gemini prompt + plan parsing (chunked, pack-aware)
 │   provider.ts       model client + JSON extraction
 │   prompts.ts        narration/enrichment prompts
 ├─ data/
 │   overpass.ts       OSM candidate collector (single broad query)
 │   places.ts         discoverPlaces = overpass + seed merge, cached
 │   popularity.ts      Wikidata sitelink fame enrichment
 │   knowledge.ts       ~60-city curated packs + looseMatch/packNameTier
 │   weather.ts         Open-Meteo (temp/precip/wind/sunset)
 │   media.ts           photo resolution hierarchy
 │   wikipedia.ts        Commons/Wikipedia photo + category fallback
 │   foursquare.ts        venue photo (optional key)
 │   routing.ts          OSRM walking-profile legs + geometry
 │   geocode.ts/seed*.ts  destination resolution
 └─ store/                Zustand + AsyncStorage persistence
```

29 (now 30) offline assertions run via `npm run validate` against the pure
modules (`dayflow.ts`, `scoring.ts`, `knowledge.ts`).

---

## 2. Current Architecture (actual pipeline, `engine.ts:77-184`)

```
geocode/center
   │
   ▼
PARALLEL: aiPlanItinerary(Gemini, pack injected into prompt)
        + getWeather + cityHeroImage
        + discoverPlaces (OSM) → enrichPopularity (Wikidata)
   │
   ▼
if AI plan: buildDaysFromAI → groundDaysToPool (snap AI stops to nearest OSM match)
else:       buildDeterministicDays (score → cluster → nearest-neighbor → buildStops)
   │
   ▼
applyTiers → injectMustSees (pack) → applyTiers → gateLowConfidence(<70%)
   │
   ▼
weatherAdapt (swap flexible outdoor → indoor on rain/heat/cold/wind)
   │
   ▼
finalizeDays: backfill thin days → sortBySlot → optimizeDayFlow (2-opt)
            → OSRM dayRoute → scheduleDay (real sunset-aware clock times)
   │
   ▼
enrichStopPhotos (day 1 only, 6.5s cap) → buildAudit (confidence/provenance)
   │
   ▼
narrate() [deterministic path only] / AI whyVisit [AI path] → UI
```

**This is the single most important finding of this audit.** The v2 spec's
required architecture places the AI **only in the final stage** ("Never
before"), receiving a fully validated itinerary and narrating it. The actual
code does the opposite on the primary path: **Gemini designs the candidate
stops directly** (`itineraryAI.ts` is asked for real place names, categories,
`lat`/`lng`, durations, slots — i.e. it picks the attractions), and
verification (`groundDaysToPool`) happens **after**, as a correction/snap step,
not as a gate that runs before the AI ever sees candidates.

In practice this mostly works today because: (a) the prompt explicitly forbids
invention and injects the knowledge pack so the model has real names to copy,
and (b) grounding snaps coordinates/names back onto verified OSM data when a
match is found. But it is architecturally backwards relative to the spec, and
it's the root cause of several weaknesses below (duplicate-prone, AI can still
silently pick an unverifiable place that grounding can't match, no real
interest-coverage guarantee, no day-theme enforcement, no per-candidate
rejection reasons/logging).

---

## 3. Detected Weaknesses (mapped to spec sections)

| Spec requirement | Current state | Gap |
|---|---|---|
| AI only in final stage | AI picks stops directly (primary path) | **Critical** — architecture inversion |
| Candidate Collector gathers ALL categories before planning | `overpassPlaces` is one query over 7 broad tag groups; no breakfast/food-market/architecture/walking-street/historic-district/waterfront granularity | High |
| Candidate Validator w/ rejection reasons | `groundDaysToPool`/`gateLowConfidence` filter silently; no logged reason, no "outside destination"/"closed permanently" checks | High |
| Duplicate Detection (semantic, e.g. "Hassan II Mosque" vs "...Esplanade") | Only exact/token-prefix `nameSimilarity`/`looseMatch`; no semantic/entity-level merge (this is AUDIT.md's existing M5) | Medium (pre-existing, documented) |
| Interest Engine directly shapes itinerary, with Interest Coverage Score | Interests only nudge `attractionScore`/`scorePlaces` weighting; AI prompt says "MUST shape" but nothing enforces it; **no coverage score exists anywhere** | **Critical** |
| Day Themes (Ancient Rome / Vatican / Historic Centre) | AI free-texts a `title`/`summary` per day with no enforced theme taxonomy or neighborhood-clustering guarantee; deterministic path has no themes at all | High |
| Multi-Day Balancing (don't stack all Tier-1 on day 1) | No explicit anti-stacking logic; `injectMustSees` finds *the first* weak Tier-3 anchor across days in pool order — can bunch must-sees | Medium |
| Walking Fatigue / rest periods | `optimizeDayFlow` minimizes distance but has no fatigue/elevation/rest-period model; coffee break exists as a fixed slot only, not fatigue-triggered | Medium |
| Transport Engine (budget/traveler-aware mode choice) | `routing.ts#decideMode` picks mode from distance only (≤1.8km walk, ≤12km transit, else taxi) — budget/traveler type never considered | Medium |
| Quality Score (weighted: interest/landmark coverage, route efficiency, time logic, photo, weather, verification) | Only `avgConfidence` (per-stop average) + `destinationConfidence` (pack coverage) exist; no composite weighted score, no interest/landmark-coverage/route-efficiency/time-logic terms | **Critical** |
| Verified Badge requires name+destination+category match, not just coordinates | `verified` is set true on any OSM hit or any `bestPoolMatch` ≥0.55 name similarity — category match isn't required, destination match isn't re-checked | Medium |
| Real Sunset Engine — window (sunset−45 to sunset+20) | ✅ Implemented this session (`scheduleDay` anchors to `sunsetTime`) — but it's a **point**, not the spec's **window** validation; nothing currently asserts the dinner stop after sunset doesn't land at 22:39 when sunset was 20:10 | Low (mostly done) |
| Restaurant Engine — never claim "best/highest rated" + walking-distance constraint | `noteFor`/AI prompt avoid superlatives already (good) — but **no walking-distance constraint** is enforced; lunch/dinner picked by `nearestWhere`/AI free text, not bounded to the current cluster | Medium |
| Nightlife Engine — prioritize districts before venues | No district-first selection; nightlife is one OSM category (`bar|pub|nightclub`) ranked like any other candidate | Medium |
| Photo Validator (reject mismatched photos: name/destination/category) | `resolveStopMedia`/`enrichPlace` resolve by name+city text query; there is **no post-fetch validation** that the returned image actually depicts the queried subject | High |
| API Failover chain (Wikipedia→Wikidata→Pack→OSM→Placeholder) | Each data source independently try/catches to `[]`/`undefined`; there's no single documented failover *chain* with ordered fallback semantics, though the net effect is similar | Low (de facto present, not formalized) |
| Caching strategy per spec's table | `withCache` exists with **per-call** TTLs already close to spec (places 7d ✅, weather 6h vs spec's 30m, routing 14d vs spec's 24h) — not all match spec exactly | Low |
| Structured debug logging (candidates rejected + reason, ranking decisions) | **No logging exists at all** — confirmed via repo-wide search in this session's history; this is also AUDIT.md L4 | High |
| Automated tests for full Definition-of-Done list | 30 offline assertions cover dayflow/scoring/knowledge only; **no tests for**: interest coverage, day themes, walking fatigue, transport mode, restaurant walking-distance, nightlife district-first, photo validation, multi-day balancing | High |

---

## 4. Technical Debt

- **`engine.ts` is a 1060-line god-module** doing geocoding orchestration, AI
  invocation, grounding, tiering, gating, weather adaptation, finalization,
  photo enrichment, audit, narration, AND the entire deterministic fallback
  builder. The spec's required "Destination → ... → UI" pipeline exists only
  as an implicit call order inside this one file, not as separable pipeline
  stages. Any new stage (Candidate Validator, Interest Coverage, Quality
  Score, Photo Validator) has no natural seam to plug into without further
  growing this file.
- Two parallel, divergent itinerary-building paths (`buildDaysFromAI` /
  `buildDeterministicDays`) duplicate slot assignment, cost estimation, and
  image fallback logic with no shared "build a guided day" abstraction.
- `nameSimilarity`/`nameTokens`/`tokensClose` in `engine.ts:271-296` are a
  near-duplicate of `looseMatch`/tokenization in `knowledge.ts`. Same
  prefix-tolerant token-matching algorithm implemented twice with slightly
  different stopword lists and thresholds.

## 5. Performance Bottlenecks

- `aiPlanItinerary` is sequential **per chunk** of 3 days (`itineraryAI.ts:215`,
  `for (let from = 1; from <= req.days; from += CHUNK)` — awaited in a loop,
  not `Promise.all`). A 9-day trip = 3 sequential Gemini round-trips. This is
  AUDIT.md's existing H3 ("parallelise Gemini chunks") — still unresolved.
- `overpassPlaces` tries up to 4 mirror endpoints **sequentially** with a 25s
  timeout each (`overpass.ts:34-54`) — a city where the first 3 mirrors are
  down could take up to 75s before falling back to seed data.
- Photo enrichment for days 2+ is fully lazy (good for first paint) but has no
  prefetch/background hydration once the user is likely to scroll there.

## 6. Duplicate Logic

- Name-similarity/token-matching duplicated in `engine.ts` and `knowledge.ts`
  (see Technical Debt above) — should be one shared module.
- Travel-mode-by-distance logic duplicated three times: `routing.ts#decideMode`
  (OSRM path), `engine.ts#buildStops`'s inline `mode` ternary (deterministic
  path), and `engine.ts#recomputeDay`'s inline ternary — three independent
  copies of "≤1.8 walk / ≤8or12 transit / else taxi" with slightly different
  thresholds (1.8/8 in two places, 1.8/12 in `decideMode`).
- `categoryImage` fallback assignment (`if (!p.imageUrl) p.imageUrl =
  categoryImage(...)`) is repeated in at least 5 places across `engine.ts`
  instead of being applied once at a single "ensure every place has *some*
  image" stage.

## 7. Poor Abstractions

- `Place` (in `types.ts`) is simultaneously: a raw OSM candidate, an
  AI-suggested approximation, a grounded/verified result, and a knowledge-pack
  injection — all the same type with optional fields disambiguating state
  (`verified?`, `source`, `tier?`, `photoResolved?`). There's no type-level
  distinction between "Candidate" (pre-validation) and "VerifiedPlace"
  (post-validation), so a stop's trustworthiness has to be re-derived ad hoc
  (`confidenceScore`) instead of being structurally guaranteed.
- `ItineraryStop.note` is overloaded: it's the AI's `whyVisit`, the
  deterministic engine's templated explanation, AND the weather-swap
  explanation, all stuffed into one free-text field with regex-based
  idempotency guards (`if (s.note && !/early|umbrella|layer/i.test(s.note))`
  at `engine.ts:533`) to avoid double-appending tips. A structured
  `{ reason, timingTip, weatherTip }` would avoid the regex guard entirely.

## 8. Broken Features

None found that crash or silently fail in a way that produces *wrong* output
on the happy path — the issues found are gaps against the v2 spec's stricter
contract (interest coverage, quality score, photo validation, day themes),
not crashes/exceptions. No live network access in this sandbox to confirm
photo-mismatch or restaurant-placement failures empirically; these are flagged
as **Missing Features / unverified-live** below rather than "broken."

## 9. Missing Features (net-new, not currently present in any form)

1. **Interest Coverage Score** — no calculation exists anywhere.
2. **Composite Itinerary Quality Score** (the 7-factor weighted spec formula)
   — only a flat confidence average exists.
3. **Day Theme assignment/enforcement** — AI free-texts a title; no taxonomy,
   no guarantee a day's stops match its theme.
4. **Walking Fatigue model** — none.
5. **Budget/traveler-aware Transport Engine** — `decideMode` is distance-only.
6. **Photo Validator** (reject subject/destination/category mismatch) — none;
   photos are fetched by name+city query and trusted.
7. **Restaurant walking-distance constraint** — none; spec requires "within
   walking distance of the current itinerary, not from anywhere in the city."
8. **Nightlife district-first selection** — none.
9. **Structured, disableable debug logging** of candidates/rejections/ranking
   — none (pre-existing AUDIT.md L4).
10. **Candidate rejection reasons** surfaced anywhere (UI or logs) — currently
    silent filtering only.
11. **Multi-day anti-stacking guarantee** for Tier-1 distribution.
12. **Saved-trip-cover guarantee** — needs verification; `imageUrl` on the
    `Itinerary` comes from `cityHeroImage`, which itself falls back through
    Wikipedia → category image, so a blank cover is unlikely but not proven
    impossible if both fail and the fallback path is broken.

## 10. Incorrect APIs

- `getWeather`'s daily window mismatches the spec's caching table (spec wants
  weather cached 30 min; current `withCache` TTL is 6h, `weather.ts:31`) — a
  minor mismatch, not a bug, but worth aligning if "weather should improve the
  itinerary" is meant to reflect near-real-time conditions.
- `routing.ts` always requests the **walking** OSRM profile regardless of
  `decideMode`'s own "transit"/"taxi" classification (AUDIT.md's existing M4)
  — so a leg labeled "taxi" still gets a walking-route geometry/duration
  underneath, which is internally inconsistent.

## 11. Unused Code

- `weatherEmoji` (`weather.ts:98-107`) — superseded by `weatherIcon`, never
  called (pre-existing AUDIT.md L2).
- `pickDaypart` (`engine.ts:677-680`) — defined, not called anywhere in the
  current file (verified via search; dead code from an earlier daypart-index
  scheme superseded by `GuideSlot`).
- `@expo/vector-icons` + `expo-font` plugin entry — superseded by Lucide
  (pre-existing AUDIT.md L1).

## 12. Potential Regressions (risk if Phase 2 proceeds)

- Moving the AI to a narration-only final stage means **the deterministic
  candidate pipeline (collection → validation → interest scoring → tiering →
  ranking) becomes the ONLY source of which places appear** — Gemini's
  "judgment" about which experiences make a good day currently fills gaps the
  algorithmic pipeline doesn't yet handle well (e.g., genuinely well-chosen
  variety, avoiding 3 museums in a row). If the new Interest/Day-Theme/Ranking
  engines aren't at least as good as the current AI-first output before the
  swap, itinerary quality could regress even though architecture improves.
  **Mitigation:** build and validate the new deterministic pipeline stages
  against the offline harness (and the 9 benchmark destinations) BEFORE
  retiring the AI-first path; keep AI-first behind a flag until the new path
  matches or beats it on the existing 30-assertion + manual benchmark suite.
- Introducing a real Interest Coverage gate could reduce day fullness (more
  candidates rejected) on cities with thin OSM coverage — needs the existing
  `MIN_STOPS_PER_DAY` backfill to remain as a safety net.
- Tightening the Verified badge to require category match in addition to name
  match could flip some currently-`verified: true` stops to unverified,
  changing average confidence scores and possibly triggering more
  `gateLowConfidence` removals — needs a benchmark-destination before/after
  comparison.

---

## 13. Execution Plan (phased, per the spec's own ordering)

| Phase | Scope | Primary files |
|---|---|---|
| 2 | **Architecture inversion**: extract `candidates.ts` (collector+validator), make AI consume a finalized day plan and only narrate/explain; AI prompt rewritten from "design the day" to "explain this day" | `engine.ts`, `itineraryAI.ts` (new `narrateOnly` mode), new `itinerary/candidates.ts` |
| 3 | **Interest Engine v2** + Interest Coverage Score | new `itinerary/interests.ts`, `scoring.ts` |
| 4 | **Validation pipeline** (candidate validator w/ reasons, confidence rules per spec bands, verified-badge tightening, quality score) | new `itinerary/validate.ts`, `scoring.ts` |
| 5 | **Photo Validator** (subject/category match check before accepting an image) | `media.ts`, `wikipedia.ts` |
| 6 | **Restaurant/Café/Nightlife engines** (walking-distance bound, district-first nightlife, no superlative claims — already true) | new `itinerary/dining.ts`, `engine.ts` |
| 7 | **Route/Transport**: budget+traveler-aware `decideMode`, walking fatigue, day themes, multi-day balancing | `routing.ts`, `optimize.ts`, `dayflow.ts` |
| 8 | Weather engine — already strong; align caching TTL only | `weather.ts` |
| 9 | **Performance**: parallelize AI chunk calls, parallel Overpass mirrors (`Promise.any`), structured logging | `itineraryAI.ts`, `overpass.ts`, new `lib/log.ts` |
| 10 | Regression testing against 9 benchmark destinations + expanded harness | `scripts/validate-itinerary.cjs` |
| 11 | UI polish (quality-score display, rejection-reason surfacing, loading-state copy) | `app/trip/[id].tsx`, `components/` |
| 12 | Final validation + engineering report | — |

This audit **is** Phase 1. No code was modified to produce it.

## 14. Risk Assessment

- **Highest risk / highest value**: Phase 2 (architecture inversion). Touches
  the core orchestrator and the AI contract; must be done carefully with the
  benchmark-destination comparison described in §12 to avoid a quality
  regression while fixing the architecture violation.
- **Medium risk**: Phases 3-4 (new scoring/validation modules) are additive
  and testable in isolation via the existing offline harness pattern before
  wiring into `engine.ts`.
- **Low risk**: Phases 5, 8, 9 (photo validation, weather TTL, performance)
  are localized and don't change itinerary *content*, only its
  speed/correctness of secondary attributes.

## 15. Files To Modify (cumulative, all phases)

`engine.ts`, `itineraryAI.ts`, `scoring.ts`, `dayflow.ts`, `optimize.ts`,
`routing.ts`, `media.ts`, `wikipedia.ts`, `weather.ts`, `overpass.ts`,
`types.ts` (new Candidate/VerifiedPlace distinction, QualityScore type),
`app/trip/[id].tsx`, plus new files: `itinerary/candidates.ts`,
`itinerary/interests.ts`, `itinerary/validate.ts`, `itinerary/dining.ts`,
`lib/log.ts`.

## 16. Expected Outcome

A pipeline where the AI literally cannot choose an attraction — it receives a
fully validated, scored, themed, routed day and only writes the prose around
it — closing the architecture's biggest gap against the spec. Plus a real,
displayable Interest Coverage Score and composite Quality Score, walking-
distance-bound restaurant/nightlife placement, and a photo validator that
rejects subject mismatches. Net effect: fewer silent failure modes, more
honest confidence/quality numbers, and an audit trail (logs) for diagnosing
future destination-specific issues — without discarding the work already
validated in `VALIDATION.md` (grounding, tiering, must-see guarantee,
confidence gating, weather adaptation, 2-opt routing, real sunset) which
remains correct and is reused, not replaced.
