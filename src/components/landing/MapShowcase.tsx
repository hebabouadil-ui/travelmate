"use client";

import { useMemo } from "react";
import { MapView } from "../map/MapView";
import { getSeedPlaces } from "@/lib/data/seedPlaces";
import { SEED_CITIES } from "@/lib/data/seed";
import { optimizeRoute } from "@/lib/itinerary/optimize";
import { Reveal } from "../Reveal";

export function MapShowcase() {
  const { center, places, route } = useMemo(() => {
    const c = SEED_CITIES["barcelona"].center;
    const p = getSeedPlaces("barcelona").filter((x) => x.category !== "restaurant").slice(0, 7);
    return { center: c, places: p, route: optimizeRoute(p, c) };
  }, []);

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-28">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-medium text-aurora-400">Live, interactive maps</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            See your whole trip,
            <br />
            <span className="gradient-text">mapped & optimized</span>
          </h2>
          <p className="mt-5 text-white/60">
            Every itinerary comes with a premium OpenStreetMap-powered map:
            categorized markers, your optimized walking route, and your live
            location. Zero Google dependencies, zero cost.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-white/70">
            {[
              "Markers color-coded by category",
              "Optimized route drawn between stops",
              "GPS support for on-the-ground discovery",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-glow" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="card-glow h-[440px] overflow-hidden rounded-3xl p-1.5">
            <div className="h-full overflow-hidden rounded-[20px]">
              <MapView center={center} places={places} route={route} numbered />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
