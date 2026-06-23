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

## 2. Execution plan

| Phase | Scope | Files |
|---|---|---|
| **V3-1** | **Recommendation Reason Engine** — deterministic "Recommended because…" per stop, surfaced on the place | `scoring.ts`, `types.ts`, `engine.ts` |
| V3-2 | Food limits + ≥70% experience dominance (with food-trip exception), measurable | `interests.ts`/`validate.ts`, `engine.ts` |
| V3-3 | Category separation map + per-day diversity & cross-day dedup checks | `interests.ts`, `engine.ts` |
| V3-4 | Photo placeholder policy (never a generic/incorrect image) + source-priority assertions | `media.ts`, `wikipedia.ts` |
| V3-5 | Performance: request dedup, prefetch, parallel AI/Overpass, structured logging | `cache.ts`, `overpass.ts`, `itineraryAI.ts` |
| V3-6 | Benchmark validation across the 9 named destinations | `scripts/validate-itinerary.cjs` |

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
