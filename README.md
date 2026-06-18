# Voyage AI — Travelmate 🧭

> Your personal AI travel concierge. Generate intelligent, route-optimized
> itineraries for anywhere in the world — powered by AI, built **entirely on
> free and open services**.

Voyage AI plans complete day-by-day trips with attractions, hidden gems,
restaurants, optimized walking routes, live weather and a running budget. It is
designed to run at **near-zero monthly cost** and to upgrade to premium
providers (OpenAI, Claude, Google Maps, Stripe) **without rewriting core logic**.

---

## 📱 Now mobile-first — native Android & iOS app

The product's primary target is a **native mobile app**, built with **Expo +
React Native** in [`mobile/`](./mobile). It reuses this project's AI provider,
itinerary engine, route optimizer, weather, discovery and Supabase layers —
now running **on-device** with offline caching, native maps, GPS, push
notifications and mobile gestures. Android is the highest priority.

➡️ **See [`mobile/README.md`](./mobile/README.md)** for run / APK / Play Store
instructions.

The Next.js code below remains as the web companion and the original home of the
shared logic.

---

## ✨ What's built

| Area | Status | Notes |
|------|--------|-------|
| Premium landing page | ✅ | Glassmorphism, Framer Motion, floating cards, interactive map & live match-score demo |
| Onboarding survey | ✅ | Traveler type, interests, food, budget, pace — persisted with Zustand |
| AI itinerary engine | ✅ | Real POIs → geographic clustering → route optimization → AI narration |
| Smart route optimization | ✅ | Nearest-neighbor routing + per-day clustering to minimize walking |
| Interactive maps | ✅ | Leaflet + OpenStreetMap, categorized markers, drawn routes, GPS |
| Weather system | ✅ | Open-Meteo forecast + rain-risk alerts per day |
| Budget planner | ✅ | Per-stop & per-day estimates by budget tier |
| Dynamic itinerary | ✅ | Remove a stop → route & budget recompute instantly |
| AI match score | ✅ | Profile-based destination ranking with explanations |
| Live GPS / nearby | ✅ | `/api/nearby` returns nearby POIs from your coordinates |
| User dashboard | ✅ | Saved trips, favorites, stats |
| Supabase auth & persistence | 🟡 scaffolded | Schema + tolerant clients; runs in guest mode with no keys |
| Admin dashboard / social / PDF memory book | 🔜 | Architecture in place; not yet implemented |

The product runs **with zero API keys** thanks to graceful fallbacks (curated
seed data + a deterministic narration engine). Add a free Gemini key to unlock
AI-written concierge notes.

---

## 🧱 Tech stack

- **Next.js 15** (App Router) · React 18 · TypeScript
- **Tailwind CSS** · **Framer Motion** · **Lucide** icons
- **Zustand** (state) · **React Query** (data)
- **Leaflet** + **OpenStreetMap** (maps — no Google)
- **Supabase** (Auth + PostgreSQL, free tier)
- **Vercel** (hosting, free tier)

### Free data & AI sources
- **Google Gemini** free tier — AI provider (default)
- **Nominatim** — geocoding
- **Overpass API** (OpenStreetMap) — points of interest
- **Open-Meteo** — weather (key-less)
- **Wikipedia / Wikidata** — enrichment (ready to wire)

---

## 🏗️ Architecture highlights

### Pluggable AI Provider Layer (`src/lib/ai`)
Application code never imports a vendor SDK. It calls `getProvider().complete()`.
Swapping Gemini → OpenAI/Claude/OpenRouter is a one-line change in
`provider.ts`. With no key configured, a deterministic `MockProvider` keeps the
whole app working for free.

### Itinerary engine (`src/lib/itinerary`)
1. `geocode` the destination (Nominatim → seed fallback)
2. `discoverPlaces` (Overpass live data merged with curated seed POIs)
3. fetch `getWeather` (Open-Meteo)
4. score places by the traveler's interests & food preference
5. `clusterIntoDays` — group nearby sights per day
6. `optimizeRoute` — nearest-neighbor ordering to cut walking
7. assign dayparts + insert nearby meals
8. `narrate` — AI writes titles/notes (or grounded templates for free)

### Resilience
Every external call has a timeout and a fallback, so the demo never breaks —
even offline or rate-limited, headline cities still produce a great plan.

---

## 🚀 Getting started

```bash
npm install
cp .env.example .env.local   # optional — app runs with no keys
npm run dev
```

Open http://localhost:3000.

### Optional configuration
- **Gemini** (free): get a key at https://aistudio.google.com/app/apikey and set
  `GEMINI_API_KEY`. Without it, the smart template engine is used.
- **Supabase** (free): create a project, run `supabase/schema.sql`, and set
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` to enable
  accounts and cloud-saved trips.

---

## 🔮 Upgrade path (no rewrite required)
- **Premium AI** → set `AI_PROVIDER=openai|claude` and add the key; implement the
  provider class alongside `gemini.ts`.
- **Google Maps/Places** → swap the tile layer & `discoverPlaces` source.
- **Stripe** → keys are already stubbed in `.env.example`.

---

## 📁 Project structure
```
src/
  app/            # routes (landing, /plan, /dashboard) + API handlers
  components/     # landing, plan, dashboard, map, shared UI
  lib/
    ai/           # provider layer (gemini, mock, prompts)
    data/         # geocode, overpass, weather, seed data
    itinerary/    # engine, route optimization, budget
    store/        # zustand profile + saved trips
    match.ts      # AI match-score engine
supabase/schema.sql
```

Built free. Designed to scale.
