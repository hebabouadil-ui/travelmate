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
5. **Honest confidence.** Every stop carries a 0–100% confidence score;
   low-confidence attractions are hidden.

---

## 3. Data sources (free, key-less unless noted)

| Purpose | Source | Notes |
|---|---|---|
| Attractions / POIs | **OpenStreetMap** (Overpass) | real coordinates, categories, opening hours |
| Fame / popularity | **Wikidata** sitelink counts | real global-fame signal (no reviews exist for free) |
| Destination expertise | **Curated Knowledge Packs** | ~60 cities, hand-authored |
| Photos | **Wikimedia Commons** → official site → Unsplash → *Pexels (staged)* | never AI-generated, never generic city stock |
| Weather | **Open-Meteo** | temp, precipitation, wind, codes |
| Routing | **OSRM** | real road/walking travel times |
| Narration/personalization | **Gemini** (AI) | organizes & explains only |

---

## 4. Generation pipeline (data-first)

`src/lib/itinerary/engine.ts → generateItinerary()`

1. **Resolve city** (picked coords or geocode).
2. **Fetch in parallel:** OSM pool (+ Wikidata popularity), weather, hero image,
   and load the **Knowledge Pack**.
3. **Plan:** AI designs the guided day **around the pack's real picks** (pack is
   injected into the prompt); falls back to the on-device deterministic builder
   with no key.
4. **Ground:** every AI stop is matched to a real OSM POI — coordinates, name
   and opening hours snapped to reality; unmatched stops flagged unverified.
5. **Tier:** every place tiered 1/2/3 (pack membership, else fame).
6. **Guarantee must-sees:** missing Tier-1 sights replace the weakest anchors
   (verified against OSM, never invented).
7. **Confidence + gate:** score each stop; drop attractions below **70%** while
   keeping the day complete.
8. **Weather-adapt:** swap flexible outdoor activities for indoor options on
   rainy/hot/cold/windy days (must-sees re-timed, not swapped).
9. **Route + schedule:** `sortBySlot` → constrained **2-opt** day-flow → OSRM
   legs → clock times (respecting opening hours).
10. **Photos:** resolve real per-place photos (day 1 up-front, rest lazily).
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

## 7. Confidence model (0–100%)

`confidenceScore()` in `scoring.ts`:

| Factor | Weight |
|---|---|
| Verified location (real OSM match) | 0.30 |
| Real photo (verified ⇒ credited) | 0.15 |
| Opening hours on file | 0.10 |
| Destination-knowledge tier (1/2) | 0.25 / 0.15 |
| Attraction importance (fame) | up to 0.20 |

Attractions **< 70%** are removed (days stay complete via backfill).

---

## 8. Destination Knowledge Packs

`src/lib/data/knowledge.ts` — ~60 curated cities, prioritized:
**Morocco, Spain, France, Italy, Japan, Thailand, United Kingdom.**
Each pack: must-see, strong, sunset spots, food experiences, neighborhoods,
cultural experiences, best months, per-day budget, weather note, coverage
confidence. Matching uses `looseMatch` (token coverage + prefix tolerance).

Principle: **100 excellent destinations over 10,000 generic ones.**

---

## 9. Output per stop

Name · real photo · time · duration · **why it was selected** · travel time from
previous · confidence score. Plan-level "Plan quality" panel shows verified vs.
approximate counts, OSM/Wikidata provenance, average confidence and destination
expertise %.

---

## 10. Quality bar & validation

`npm run validate` runs 29 assertions against the real algorithms offline
(tiering, must-see matching, confidence, route flow, scheduling, opening-hours
guard). See `VALIDATION.md` for the full report and the 10-point checklist.

Live, on-device spot-checks remain for photo correctness and day-trip travel
legs (cannot be verified in the network-restricted CI).

---

## 11. Roadmap (post-validation priorities)

1. **Real astronomical sunset times** for the sunset slot (Open-Meteo daily
   sunrise/sunset).
2. **Pexels fallback photos** + name disambiguation.
3. **Additional destination packs** (expand the priority countries; add new
   ones only when curated to the same quality).

Deliberately **not** prioritized: more UI features, more breadth. The goal is
itinerary quality trustworthy enough for a real traveler to follow.

---

## 12. Key modules

| Area | File |
|---|---|
| Orchestration | `src/lib/itinerary/engine.ts` |
| Day flow / scheduling | `src/lib/itinerary/dayflow.ts`, `slots.ts` |
| Scoring / confidence | `src/lib/itinerary/scoring.ts` |
| Knowledge packs | `src/lib/data/knowledge.ts` |
| OSM / fame / weather | `src/lib/data/overpass.ts`, `popularity.ts`, `weather.ts` |
| AI planning prompt | `src/lib/ai/itineraryAI.ts` |
| Validation harness | `mobile/scripts/validate-itinerary.cjs` |
