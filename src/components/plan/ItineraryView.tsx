"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  CloudRain,
  Cloud,
  Wallet,
  Heart,
  Share2,
  Save,
  Footprints,
  Bus,
  Car,
  X,
  Gem,
  Check,
} from "lucide-react";
import type { DayWeather, Itinerary, ItineraryDay, ItineraryStop } from "@/lib/types";
import { MapView } from "../map/MapView";
import { formatCurrency, haversineKm, walkingMinutes } from "@/lib/utils";
import { useProfile } from "@/lib/store/useProfile";

const DAYPART_LABEL: Record<string, string> = {
  morning: "Morning",
  lunch: "Lunch",
  afternoon: "Afternoon",
  dinner: "Dinner",
  evening: "Evening",
};

export function ItineraryView({ itinerary }: { itinerary: Itinerary }) {
  const [trip, setTrip] = useState<Itinerary>(itinerary);
  const [activeDay, setActiveDay] = useState(0);
  const [saved, setSaved] = useState(false);
  const { saveTrip, favorites, toggleFavorite } = useProfile();

  const day = trip.days[activeDay];
  const dayPlaces = useMemo(() => day?.stops.map((s) => s.place) ?? [], [day]);
  const isFav = favorites.includes(trip.id);

  const handleSave = () => {
    saveTrip(trip);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/plan?destination=${encodeURIComponent(
      trip.destination
    )}`;
    if (navigator.share) {
      await navigator.share({ title: `My ${trip.destination} trip`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const removeStop = (stopIdx: number) => {
    setTrip((prev) => {
      const days = prev.days.map((d, di) => {
        if (di !== activeDay) return d;
        const stops = recompute(d.stops.filter((_, i) => i !== stopIdx));
        const estimatedCost = stops.reduce((s, st) => s + (st.estimatedCost ?? 0), 0) + 12;
        return { ...d, stops, estimatedCost };
      });
      const totalEstimatedCost = days.reduce((s, d) => s + d.estimatedCost, 0);
      return { ...prev, days, totalEstimatedCost };
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-aurora-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 capitalize">
              {trip.engine === "gemini" ? "✨ Gemini AI" : "Smart engine"}
            </span>
            <span className="text-white/40">{trip.days.length}-day plan</span>
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {trip.destination}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => toggleFavorite(trip.id)} className="btn btn-ghost">
            <Heart className={`h-4 w-4 ${isFav ? "fill-rose-400 text-rose-400" : ""}`} />
            {isFav ? "Favorited" : "Favorite"}
          </button>
          <button onClick={handleShare} className="btn btn-ghost">
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved" : "Save trip"}
          </button>
        </div>
      </div>

      {/* Budget summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="Estimated total"
          value={formatCurrency(trip.totalEstimatedCost, trip.currency)}
        />
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="Per day"
          value={formatCurrency(
            Math.round(trip.totalEstimatedCost / trip.days.length),
            trip.currency
          )}
        />
        <SummaryCard
          icon={<Gem className="h-5 w-5" />}
          label="Hidden gems"
          value={String(
            trip.days.reduce(
              (n, d) => n + d.stops.filter((s) => s.place.hiddenGem).length,
              0
            )
          )}
        />
      </div>

      {/* Map */}
      <div className="card-glow mt-6 h-[380px] overflow-hidden rounded-3xl p-1.5">
        <div className="h-full overflow-hidden rounded-[20px]">
          <MapView
            center={trip.center}
            places={dayPlaces}
            route={dayPlaces}
            numbered
          />
        </div>
      </div>

      {/* Day tabs */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {trip.days.map((d, i) => (
          <button
            key={d.day}
            onClick={() => setActiveDay(i)}
            className={`flex shrink-0 flex-col rounded-2xl border px-4 py-2 text-left transition ${
              i === activeDay
                ? "border-aurora bg-aurora/15"
                : "border-white/10 bg-white/[0.03] hover:bg-white/5"
            }`}
          >
            <span className="text-xs text-white/50">Day {d.day}</span>
            <span className="text-sm font-medium">{d.title}</span>
          </button>
        ))}
      </div>

      {/* Day detail */}
      {day && (
        <motion.div
          key={day.day}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]"
        >
          <div>
            <div className="glass rounded-2xl p-5">
              <h2 className="font-display text-xl font-semibold">{day.title}</h2>
              <p className="mt-1 text-sm text-white/55">{day.summary}</p>
            </div>
            <div className="mt-4">
              <AnimatePresence initial={false}>
                {day.stops.map((stop, idx) => (
                  <StopRow
                    key={stop.place.id}
                    stop={stop}
                    onRemove={() => removeStop(idx)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          <aside className="space-y-4">
            {day.weather && <WeatherCard weather={day.weather} />}
            <div className="glass rounded-2xl p-5">
              <p className="text-sm text-white/50">Day budget</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {formatCurrency(day.estimatedCost, trip.currency)}
              </p>
              <p className="mt-2 text-xs text-white/40">
                Includes meals, attractions & local transport.
              </p>
            </div>
            <div className="glass rounded-2xl p-5 text-xs text-white/45">
              Tip: remove any stop and the route + budget recalculate instantly.
            </div>
          </aside>
        </motion.div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-5">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-aurora/15 text-aurora-400">
        {icon}
      </span>
      <div>
        <p className="text-xs text-white/50">{label}</p>
        <p className="font-display text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function StopRow({ stop, onRemove }: { stop: ItineraryStop; onRemove: () => void }) {
  const TravelIcon =
    stop.travelMode === "walk" ? Footprints : stop.travelMode === "transit" ? Bus : Car;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
    >
      {stop.travelFromPrevMin ? (
        <div className="flex items-center gap-2 py-2 pl-5 text-xs text-white/40">
          <TravelIcon className="h-3.5 w-3.5" />
          {stop.travelFromPrevMin} min {stop.travelMode}
        </div>
      ) : null}
      <div className="group glass relative flex gap-4 rounded-2xl p-4">
        <div className="flex flex-col items-center">
          <span className="rounded-full bg-aurora/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-aurora-400">
            {DAYPART_LABEL[stop.daypart]}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{stop.place.name}</h3>
            {stop.place.hiddenGem && (
              <span className="flex items-center gap-1 rounded-full bg-teal-glow/15 px-2 py-0.5 text-[10px] text-teal-glow">
                <Gem className="h-3 w-3" /> gem
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs capitalize text-white/40">
            {stop.place.category}
            {stop.place.cuisine ? ` · ${stop.place.cuisine}` : ""} · ~{stop.durationMin} min
          </p>
          {stop.note && <p className="mt-2 text-sm text-white/60">{stop.note}</p>}
        </div>
        <button
          onClick={onRemove}
          aria-label="Remove stop"
          className="absolute right-3 top-3 rounded-full p-1.5 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

function WeatherCard({ weather }: { weather: DayWeather }) {
  const Icon = weather.rainRisk ? CloudRain : weather.weatherCode <= 2 ? Sun : Cloud;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">{weather.date}</p>
          <p className="font-display text-2xl font-semibold">
            {weather.tempMaxC}° <span className="text-base text-white/40">/ {weather.tempMinC}°</span>
          </p>
        </div>
        <Icon className={`h-9 w-9 ${weather.rainRisk ? "text-sky-400" : "text-sun-glow"}`} />
      </div>
      <p className="mt-2 text-sm text-white/60">{weather.summary}</p>
      {weather.rainRisk && (
        <p className="mt-3 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          ☔ Rain likely — consider indoor stops (museums) for this day.
        </p>
      )}
    </div>
  );
}

/** Recompute travel times after a stop is removed (lightweight dynamic recalc). */
function recompute(stops: ItineraryStop[]): ItineraryStop[] {
  return stops.map((stop, i) => {
    if (i === 0) return { ...stop, travelFromPrevMin: 0, travelMode: undefined };
    const prev = stops[i - 1].place;
    const km = haversineKm(prev, stop.place);
    const mode: ItineraryStop["travelMode"] = km < 1.8 ? "walk" : km < 8 ? "transit" : "taxi";
    return {
      ...stop,
      travelMode: mode,
      travelFromPrevMin:
        mode === "walk"
          ? walkingMinutes(km)
          : Math.max(8, Math.round((km / (mode === "transit" ? 18 : 30)) * 60)),
    };
  });
}
