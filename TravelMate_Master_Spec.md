# TravelMate — Master Specification

> The application should feel like **a local travel expert planned the entire
> day** — not a chatbot, not a list of attractions, not random recommendations.
> A traveler should land in Marrakech, Madrid, Tangier or Tokyo and follow the
> itinerary confidently from morning until night.

This document is the single source of truth for what TravelMate is, the
principles it must never violate, and how the system is built.

---

## 1. Product vision

TravelMate generates **complete, realistic travel days** for any city, grounded
in **real, verified data**, structured like a local guide would plan them, and
honest about its own confidence.

Every recommendation must be: **real · verified · relevant · structured ·
optimized · supported by a real photo.**

---

## 2. Core principles (non-negotiable)

1. **Never start with AI. Start with verified data.** AI only *organizes,
   optimizes, explains and personalizes*. It must never invent attractions,
   restaurants, opening hours, coordinates, ratings or reviews.
2. **No fabrication.** If data is missing, say "Information unavailable" — never
   guess. We do **not** invent star ratings/review counts (no free source has
   them).
3. **Complete days, not lists.** Answer "what do I do from morning to night?"
4. **Famous places dominate.** A world-famous attraction is never dropped
   because a smaller one is closer.
5. **Honest confidence.** Every stop carries a 0–100% confidence score,
   banded 90 Excellent / 70 Trusted / 50 Fallback (kept, clearly labeled) /
   below 50 Reject (never displayed).

---

## 3. Data sources (free, key-less unless noted)

| Purpose | Source | Notes |
|---|---|---|
| Attractions / POIs | **OpenStreetMap** (Overpass) | real coordinates, categories, opening hours |
| Fame / popularity | **Wikidata** sitelink counts | real global-fame signal (no reviews exist for free) |
| Destination expertise | **Curated Knowledge Packs** | ~60 cities, hand-authored |
| Photos | **Wikimedia Commons** → official site → Unsplash → *Pexels (staged)* | never AI-generated, never generic city stock; Wikipedia hits pass a subject-match gate (`isMatchingArticle`) before being trusted |
| Weather | **Open-Meteo** | temp, precipitation, wind, codes |
| Routing | **OSRM** | real road/walking travel times |
| Narration/personalization | **Gemini** (AI) | organizes & explains only |

---

## 4. Generation pipeline (data-first)

`src/lib/itinerary/engine.ts → generateItinerary()`

1. **Resolve city** (picked coords or geocode).
2. **Fetch in parallel:** OSM pool (+ Wikidata popularity), weather, hero image,
   and load the **Knowledge Pack**.
3. **Plan (deterministic, always):** discover → score → cluster → route real
   places only, from the OSM pool and the pack — never from a model guess.
   This is the *only* path; there is no separate AI-planning branch to fall
   back from. Meals are bound to within walking distance of the current
   itinerary (`nearestWithinRadius`, 1.5km), never picked from anywhere in
   the city; evening nightlife prefers a real, OSM-density-backed district
   over an isolated venue that's merely closer (`bestNightlifeVenue`). Food is
   then capped to a meal allowance (≤1 breakfast + 1 lunch + 1 dinner + 1
   optional drink) so experiences dominate the day (`capFoodStops`); food-
   focused trips are exempt.
4. **Tier:** every place tiered 1/2/3 (pack membership, else fame).
5. **Guarantee must-sees:** missing Tier-1 sights replace the weakest anchors
   (verified against OSM, never invented), spread across days by
   `leastLoadedOrder` so injections never stack onto Day 1.
6. **Confidence + gate:** score each stop; drop only Reject-band attractions
   (**< 50%**) while keeping the day complete — Fallback-band stops (50-69%)
   are kept and honestly labeled, not silently discarded.
7. **Weather-adapt:** swap flexible outdoor activities for indoor options on
   rainy/hot/cold/windy days (must-sees re-timed, not swapped).
8. **Route + schedule:** `sortBySlot` → constrained **2-opt** day-flow → OSRM
   legs → clock times (respecting opening hours). Travel mode for every leg
   comes from one source of truth (`decideTravelMode`): budget-tiered
   walk/transit/taxi ceilings plus a walking-fatigue model that pushes later
   legs to transit once the day's cumulative walking passes 3km. Each day
   also gets a closed-taxonomy `theme` (`dayTheme`) derived from its real
   stop categories, never a free-text label the stops don't support.
9. **Photos:** resolve real per-place photos (day 1 up-front, rest lazily).
10. **Narrate:** AI is consulted for the first and only time here — given the
    finished, routed plan and asked only to write titles/summaries/per-stop
    notes (`narrate()`); it cannot add, remove, rename or relocate a stop.
    Without a configured AI key, grounded templates produce the same effect.
11. **Audit:** per-stop confidence + plan-level provenance summary.

---

## 5. The guided day (fixed structure)

Each day is a sequence of **moments**, each with a clock time, a reason, a
duration, travel-from-previous, and a confidence score:

```
Breakfast → Morning activity → Main attraction → Lunch →
Afternoon activity → Coffee break → Sunset → Dinner → Night
```

Slot model lives in `src/lib/itinerary/slots.ts`; flow/scheduling in
`dayflow.ts`.

---

## 6. Place priority tiers

- **Tier 1 — Must-see:** pack must-see list, or very high fame. Always included
  first; shown with a "Must-see" badge.
- **Tier 2 — Strong:** pack strong list, or solid fame.
- **Tier 3 — Optional:** everything else; first to be gated/replaced.

Selection value = fame (dominant) + category value + interest match + tier
boost − a *gentle* distance tie-breaker (`scoring.ts`).

---

## 7. Interest Engine

`src/lib/itinerary/interests.ts` is the single source of truth for which
real place categories satisfy each traveller interest (monuments, museums,
beaches, nature, food, architecture, shopping, photography, nightlife).
Interests act in two places, not one:

1. **Scoring** — a category match nudges `attractionScore`/`scorePlaces`
   ranking upward (a preference, same as before).
2. **Enforcement** — after must-sees are guaranteed, `ensureInterestCoverage()`
   checks the *built* trip: any interest with zero matching stops gets its
   single best real OSM candidate swapped into the weakest Tier-3 attraction
   slot (least-loaded day first; must-sees are never overwritten). An
   interest is left honestly uncovered only when the destination's real data
   has nothing in that category — never invented.

**Interest Coverage Score** (`interestCoverageScore()`): 0–100%, the fraction
of selected interests actually represented by a real stop in the finished
trip — a measurement of the result, reported on `Itinerary.audit.interestCoverage`.

---

## 8. Confidence model (0–100%)

`confidenceScore()` in `scoring.ts`:

| Factor | Weight |
|---|---|
| Verified location (real OSM match) | 0.30 |
| Real photo (verified ⇒ credited) | 0.15 |
| Opening hours on file | 0.10 |
| Destination-knowledge tier (1/2) | 0.25 / 0.15 |
| Attraction importance (fame) | up to 0.20 |

Bands: **90 Excellent / 70 Trusted / 50 Fallback / below 50 Reject.**
Only Reject-band attractions are removed (days stay complete via backfill);
Fallback stops are kept and clearly labeled, never hidden.

---

## 9. Destination Knowledge Packs

`src/lib/data/knowledge.ts` — ~60 curated cities, prioritized:
**Morocco, Spain, France, Italy, Japan, Thailand, United Kingdom.**
Each pack: must-see, strong, sunset spots, food experiences, neighborhoods,
cultural experiences, best months, per-day budget, weather note, coverage
confidence. Matching uses `looseMatch` (token coverage + prefix tolerance).

Principle: **100 excellent destinations over 10,000 generic ones.**

---

## 10. Output per stop

Name · real photo · time · duration · **why it was selected** · travel time from
previous · confidence score · **Verified badge** (real, mapped OSM object,
inside the destination — never from coordinates alone). Plan-level "Plan
quality" panel shows verified vs. approximate counts, OSM/Wikidata
provenance, average confidence, destination expertise %, Interest Coverage
Score, and the composite **Itinerary Quality Score** (0-100: Interest
Coverage 20% / Landmark Coverage 20% / Route Efficiency 15% / Time Logic
15% / Photo Quality 10% / Weather Adaptation 10% / Verification Quality
10%), honestly labeled Premium Plan / Very Good / Good / Limited Verified
Data — never presenting a low-quality plan as high quality.

---

## 11. Quality bar & validation

`npm run validate` runs 93 assertions against the real algorithms offline
(tiering, must-see matching, interest coverage, confidence bands, candidate
validation, Verified badge, Itinerary Quality Score, the photo subject-match
validator, the meal walking-distance constraint, district-first nightlife,
budget-tiered travel mode + walking fatigue, day-theme taxonomy, deterministic
recommendation reasons, food-limit/experience-dominance enforcement, route
flow, scheduling, opening-hours guard). See `VALIDATION.md` for the full
report and the 10-point checklist.

Live, on-device spot-checks remain for photo correctness and day-trip travel
legs (cannot be verified in the network-restricted CI).

---

## 12. Roadmap (post-validation priorities)

1. **Real astronomical sunset times** for the sunset slot (Open-Meteo daily
   `sunset`). ✅ **Shipped** — `scheduleDay` now anchors the sunset stop to
   the real local sunset time for that city/date.
2. **Pexels fallback photos** + name disambiguation.
3. **Additional destination packs** (expand the priority countries; add new
   ones only when curated to the same quality).

Deliberately **not** prioritized: more UI features, more breadth. The goal is
itinerary quality trustworthy enough for a real traveler to follow.

---

## 13. Key modules

| Area | File |
|---|---|
| Orchestration | `src/lib/itinerary/engine.ts` |
| Interest Engine + Coverage Score | `src/lib/itinerary/interests.ts` |
| Day flow / scheduling | `src/lib/itinerary/dayflow.ts`, `slots.ts` |
| Scoring / confidence | `src/lib/itinerary/scoring.ts` |
| Knowledge packs | `src/lib/data/knowledge.ts` |
| OSM / fame / weather | `src/lib/data/overpass.ts`, `popularity.ts`, `weather.ts` |
| AI narration prompt (narrator-only — never plans) | `src/lib/ai/prompts.ts` |
| Validation harness | `mobile/scripts/validate-itinerary.cjs` |
