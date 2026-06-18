"use client";

import Link from "next/link";
import { Heart, MapPin, Trash2, Plus, Luggage } from "lucide-react";
import { useProfile } from "@/lib/store/useProfile";
import { formatCurrency } from "@/lib/utils";
import { TRAVELER_TYPES } from "@/lib/onboarding-config";

export function Dashboard() {
  const { savedTrips, favorites, removeTrip, toggleFavorite, profile } = useProfile();

  const travelerLabel =
    TRAVELER_TYPES.find((t) => t.value === profile.travelerType)?.label ?? "Traveler";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-aurora-400">Welcome back</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            Your travel dashboard
          </h1>
        </div>
        <Link href="/plan" className="btn btn-primary">
          <Plus className="h-4 w-4" /> New trip
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Saved trips" value={String(savedTrips.length)} />
        <Stat label="Favorites" value={String(favorites.length)} />
        <Stat
          label="Days planned"
          value={String(savedTrips.reduce((n, t) => n + t.days.length, 0))}
        />
        <Stat label="Traveler type" value={travelerLabel} />
      </div>

      <h2 className="mb-4 mt-12 font-display text-2xl font-semibold">Saved trips</h2>

      {savedTrips.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-3xl px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-aurora/15 text-aurora-400">
            <Luggage className="h-6 w-6" />
          </span>
          <p className="mt-4 text-lg font-medium">No trips yet</p>
          <p className="mt-1 max-w-sm text-sm text-white/50">
            Generate your first AI itinerary and save it — it&apos;ll show up here.
          </p>
          <Link href="/plan" className="btn btn-primary mt-6">
            Generate My Trip
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {savedTrips.map((trip) => (
            <div key={trip.id} className="card-glow p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-semibold">{trip.destination}</h3>
                  <p className="mt-1 text-sm text-white/50">
                    {trip.days.length} days · {formatCurrency(trip.totalEstimatedCost, trip.currency)}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(trip.id)}
                  aria-label="Toggle favorite"
                  className="rounded-full p-1.5 hover:bg-white/10"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favorites.includes(trip.id) ? "fill-rose-400 text-rose-400" : "text-white/40"
                    }`}
                  />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {trip.days[0]?.stops.slice(0, 3).map((s) => (
                  <span
                    key={s.place.id}
                    className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60"
                  >
                    <MapPin className="h-3 w-3" /> {s.place.name}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <Link
                  href={`/plan?destination=${encodeURIComponent(trip.destination)}`}
                  className="text-sm font-medium text-aurora-400 hover:text-aurora"
                >
                  Regenerate →
                </Link>
                <button
                  onClick={() => removeTrip(trip.id)}
                  aria-label="Delete trip"
                  className="rounded-full p-1.5 text-white/30 hover:bg-white/10 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
