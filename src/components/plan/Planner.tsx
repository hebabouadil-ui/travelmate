"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import {
  ACTIVITY_LEVELS,
  BUDGETS,
  FOOD_PREFERENCES,
  INTERESTS,
  TRAVELER_TYPES,
} from "@/lib/onboarding-config";
import type { Budget, Interest, Itinerary, TripRequest } from "@/lib/types";
import { useProfile } from "@/lib/store/useProfile";
import { ItineraryView } from "./ItineraryView";

type Phase = "survey" | "trip" | "loading" | "result";

const LOADING_STEPS = [
  "Locating your destination…",
  "Discovering attractions & hidden gems…",
  "Checking the weather forecast…",
  "Optimizing your daily routes…",
  "Writing your concierge notes…",
];

export function Planner() {
  const params = useSearchParams();
  const { profile, setProfile, completeOnboarding, onboardingComplete } = useProfile();

  const [phase, setPhase] = useState<Phase>(onboardingComplete ? "trip" : "survey");
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Trip form
  const [destination, setDestination] = useState(params.get("destination") ?? "");
  const [days, setDays] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [budget, setBudget] = useState<Budget>(profile.budget ?? "medium");

  useEffect(() => {
    if (phase !== "loading") return;
    setLoadingStep(0);
    const t = setInterval(
      () => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      1400
    );
    return () => clearInterval(t);
  }, [phase]);

  const generate = async () => {
    if (!destination.trim()) return;
    setPhase("loading");
    setError(null);
    const req: TripRequest = {
      destination: destination.trim(),
      startDate: startDate || undefined,
      days,
      budget,
      interests: profile.interests ?? [],
      profile,
    };
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Generation failed");
      const data = (await res.json()) as Itinerary;
      setItinerary(data);
      setPhase("result");
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setPhase("trip");
    }
  };

  if (phase === "result" && itinerary) {
    return <ItineraryView itinerary={itinerary} />;
  }

  if (phase === "loading") {
    return <LoadingScreen step={loadingStep} destination={destination} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-32">
      <AnimatePresence mode="wait">
        {phase === "survey" ? (
          <SurveyStep
            key="survey"
            onComplete={() => {
              completeOnboarding();
              setBudget(profile.budget ?? "medium");
              setPhase("trip");
            }}
          />
        ) : (
          <motion.div
            key="trip"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <button
              onClick={() => setPhase("survey")}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Edit preferences
            </button>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Where to next?
            </h1>
            <p className="mt-2 text-white/55">
              We&apos;ll build a route-optimized plan tuned to your style.
            </p>

            <div className="mt-8 space-y-6">
              <Field label="Destination">
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Barcelona, Tokyo, Marrakech…"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-lg outline-none transition focus:border-aurora focus:bg-white/[0.07]"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date (optional)">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-aurora [color-scheme:dark]"
                  />
                </Field>
                <Field label={`Number of days · ${days}`}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value, 10))}
                    className="mt-4 w-full accent-aurora"
                  />
                </Field>
              </div>

              <Field label="Budget">
                <div className="grid grid-cols-3 gap-3">
                  {BUDGETS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => setBudget(b.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        budget === b.value
                          ? "border-aurora bg-aurora/15"
                          : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
                      }`}
                    >
                      <p className="font-medium">{b.label}</p>
                      <p className="text-xs text-white/45">{b.hint}</p>
                    </button>
                  ))}
                </div>
              </Field>

              {error && (
                <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </p>
              )}

              <button
                onClick={generate}
                disabled={!destination.trim()}
                className="btn btn-primary w-full py-4 text-base"
              >
                <Sparkles className="h-4 w-4" /> Generate My Trip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}

function SurveyStep({ onComplete }: { onComplete: () => void }) {
  const { profile, setProfile } = useProfile();
  const interests = profile.interests ?? [];

  const toggleInterest = (i: Interest) =>
    setProfile({
      interests: interests.includes(i)
        ? interests.filter((x) => x !== i)
        : [...interests, i],
    });

  const ready = Boolean(profile.travelerType && interests.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Let&apos;s tune your concierge
      </h1>
      <p className="mt-2 text-white/55">
        A few quick taps so every recommendation fits you.
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-white/70">What kind of traveler are you?</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TRAVELER_TYPES.map((t) => (
            <Chip
              key={t.value}
              active={profile.travelerType === t.value}
              onClick={() => setProfile({ travelerType: t.value })}
            >
              <span className="text-lg">{t.emoji}</span> {t.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-medium text-white/70">
          What are you into? <span className="text-white/30">(pick a few)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Chip key={i.value} active={interests.includes(i.value)} onClick={() => toggleInterest(i.value)} pill>
              <span>{i.emoji}</span> {i.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium text-white/70">Food preference</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {FOOD_PREFERENCES.map((f) => (
              <Chip
                key={f.value}
                active={profile.foodPreference === f.value}
                onClick={() => setProfile({ foodPreference: f.value })}
              >
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium text-white/70">Pace</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {ACTIVITY_LEVELS.map((a) => (
              <Chip
                key={a.value}
                active={profile.activityLevel === a.value}
                onClick={() => setProfile({ activityLevel: a.value })}
              >
                <span className="block">{a.label}</span>
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-medium text-white/70">Budget</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {BUDGETS.map((b) => (
            <Chip
              key={b.value}
              active={profile.budget === b.value}
              onClick={() => setProfile({ budget: b.value })}
            >
              {b.label}
            </Chip>
          ))}
        </div>
      </section>

      <button
        onClick={onComplete}
        disabled={!ready}
        className="btn btn-primary mt-9 w-full py-4 text-base"
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
      {!ready && (
        <p className="mt-3 text-center text-xs text-white/40">
          Pick a traveler type and at least one interest to continue.
        </p>
      )}
    </motion.div>
  );
}

function Chip({
  children,
  active,
  onClick,
  pill,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  pill?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 border px-3 py-2.5 text-sm transition ${
        pill ? "rounded-full" : "rounded-2xl"
      } ${
        active
          ? "border-aurora bg-aurora/20 text-white"
          : "border-white/10 bg-white/5 text-white/65 hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

function LoadingScreen({ step, destination }: { step: number; destination: string }) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse-ring rounded-full border border-aurora/40" />
        <div className="grid h-20 w-20 place-items-center rounded-full bg-aurora/20">
          <Loader2 className="h-8 w-8 animate-spin text-aurora-400" />
        </div>
      </div>
      <h2 className="mt-8 font-display text-2xl font-semibold">
        Crafting your {destination || "trip"} itinerary
      </h2>
      <div className="mt-6 space-y-2 text-center">
        {LOADING_STEPS.map((s, i) => (
          <p
            key={s}
            className={`text-sm transition ${
              i <= step ? "text-white/80" : "text-white/25"
            }`}
          >
            {i < step ? "✓ " : i === step ? "› " : ""}
            {s}
          </p>
        ))}
      </div>
    </div>
  );
}
