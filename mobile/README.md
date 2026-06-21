# Voyage AI — Mobile 🧭📱

> The native **Android & iOS** app for Voyage AI (Travelmate). A premium,
> mobile-first AI travel concierge built with **Expo + React Native**, reusing
> the web project's AI / itinerary / routing / weather / discovery engines —
> now running **entirely on-device** for true offline support.

Android is the highest priority; iOS works as a bonus from the same codebase.

---

## ✨ Mobile feature set

| Feature | How |
|---|---|
| 🧠 On-device AI itinerary engine | Ported `lib/itinerary` runs locally — no backend needed |
| 🗺️ Native maps | `react-native-maps` (Google on Android / Apple on iOS) with categorized markers + route polyline |
| 🧭 Native GPS | `expo-location` powers the **Nearby** tab + "center on me" |
| 🚗 Native navigation | Deep-links into Google/Apple Maps for turn-by-turn directions |
| 🔔 Push / local notifications | `expo-notifications` — trip reminders, deep-link back into a trip |
| 📴 Offline itineraries | Saved trips persist to `AsyncStorage`; open & edit them with no connection |
| 💾 Offline caching | Every data source (geocode / POIs / weather) caches with TTL + stale fallback |
| 👆 Mobile gestures | Swipe-to-delete trips, haptics on every key action |
| 🎞️ Smooth transitions | `react-native-reanimated` + native stack/shared animations |
| 📱 Mobile-first UI | Bottom tabs, glass surfaces, gradient brand — Airbnb × Apple Maps feel |
| ✏️ Dynamic editing | Remove a stop → route, travel times & budget recompute instantly on-device |

Inspired by **Airbnb**, **Google Maps**, **TripAdvisor** and **Apple Maps**.

---

## 🧱 Architecture

```
mobile/
  app/                         # Expo Router (file-based navigation)
    _layout.tsx                # root stack, providers, splash, notifications
    index.tsx                  # cold-start router (onboarding vs app)
    onboarding.tsx             # animated multi-step survey
    (tabs)/                    # bottom tab navigator
      index.tsx                # Discover (AI destination matches)
      plan.tsx                 # Plan a trip → generate itinerary
      nearby.tsx               # Live GPS nearby places
      trips.tsx                # Saved trips (offline, swipe-to-delete)
      profile.tsx              # Preferences, settings, engine status
    trip/[id].tsx              # Itinerary detail: map, days, weather, budget
  src/
    lib/                       # ← REUSED business logic (ported from web)
      ai/                      # provider layer (gemini / mock) + prompts
      data/                    # geocode, overpass, weather, seed (cache-wrapped)
      itinerary/               # engine, route optimization, budget
      match.ts                 # AI destination match-score engine
      cache.ts                 # AsyncStorage TTL cache (offline backbone)
      navigation.ts            # native maps deep-links
      notifications.ts         # local/push notifications
      supabase/                # optional cloud client (AsyncStorage sessions)
    components/                # native UI (cards, map, primitives)
    hooks/                     # useLocation (GPS), useNetwork
    store/                     # zustand + AsyncStorage persistence
    theme/                     # design system (colors, spacing, categories)
  app.config.ts                # Expo config (Android package, permissions, plugins)
  eas.json                     # build profiles (APK + Play Store AAB)
```

**Only the frontend was replaced.** The AI provider, itinerary engine, route
optimizer, weather, discovery and Supabase layers are the same logic as the web
app, adapted to run on-device with an offline cache.

---

## 🚀 Run it (development)

```bash
cd mobile
npm install
cp .env.example .env        # optional — runs key-free
```

Because the app uses native modules (maps, location, notifications), it needs a
**development build** (not Expo Go):

```bash
# Generate the native android/ project
npx expo prebuild -p android

# Build & launch on a connected device / emulator (needs Android SDK)
npx expo run:android
```

Or use **Expo's cloud builds** (no local Android SDK required) — see below.

---

## 📦 Build an APK on GitHub (no local setup)

A GitHub Actions workflow ([`.github/workflows/android-apk.yml`](../.github/workflows/android-apk.yml))
builds an installable APK on every push to `mobile/**` (and on manual
**Run workflow**), then attaches it to a **GitHub Release** for direct download.

1. Open the repo's **Actions** tab → **Build Android APK** → wait for the green check.
2. Grab the APK from the auto-created **Release** (`android-v1.0.N`) or from the
   run's **Artifacts** (`voyage-ai-apk`).
3. On your Android phone, open the `.apk`, allow "install from unknown sources", launch.

The release build is signed with the Expo debug keystore, so it installs with no
secrets. Add an `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (and optionally
`EXPO_PUBLIC_GEMINI_API_KEY`) **repository secret** and re-run to bake in the live
native map / AI narration.

## 📦 Build via EAS / publish to Google Play

This project is also configured for [EAS Build](https://docs.expo.dev/build/introduction/).

```bash
npm i -g eas-cli
eas login
eas build:configure        # one-time, links the project

# Direct-install APK (for testing on a phone / Android Studio):
eas build -p android --profile preview      # → downloadable .apk

# Play Store bundle (.aab):
eas build -p android --profile production    # → upload to Play Console
eas submit -p android                        # optional automated submit
```

`eas.json` already defines:
- **development** — dev-client APK
- **preview** — internal-distribution **APK** (sideload / Android Studio)
- **production** — **AAB** for the Play Store with auto-incremented versionCode

### Android Studio
After `npx expo prebuild -p android`, open the generated **`mobile/android/`**
folder in Android Studio and build/run as a standard Gradle project.

---

## 🔑 Optional configuration

| Key | Unlocks | Free? |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Live native Google map on Android | Free tier |
| `EXPO_PUBLIC_GEMINI_API_KEY` + `EXPO_PUBLIC_AI_PROVIDER=gemini` | AI-written concierge notes | Free tier |
| `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Cloud accounts & trip sync | Free tier |

Without any keys the app still: generates real, route-optimized itineraries from
free OpenStreetMap/Open-Meteo data, shows a styled map preview, writes polished
templated narration, works offline, and tracks GPS for nearby discovery.

---

## ✅ Validated

- `npm run typecheck` — passes (strict TypeScript)
- `npx expo export -p android` — bundles cleanly (1400+ modules)
- `npx expo config` — config + SDK 52 resolve

Built free. Designed to ship.
