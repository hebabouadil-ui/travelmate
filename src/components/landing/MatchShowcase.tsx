"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { matchDestinations } from "@/lib/match";
import { INTERESTS } from "@/lib/onboarding-config";
import type { Interest } from "@/lib/types";
import { Reveal } from "../Reveal";

export function MatchShowcase() {
  const [selected, setSelected] = useState<Interest[]>(["food", "architecture", "monuments"]);

  const matches = useMemo(
    () => matchDestinations({ interests: selected }).slice(0, 4),
    [selected]
  );

  const toggle = (i: Interest) =>
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  return (
    <section id="match" className="relative mx-auto max-w-6xl px-4 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your <span className="gradient-text">perfect match</span>
        </h2>
        <p className="mt-4 text-white/60">
          Pick a few interests and watch destinations re-rank in real time — each
          with a score and a reason.
        </p>
      </Reveal>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {INTERESTS.map((i) => {
          const active = selected.includes(i.value);
          return (
            <button
              key={i.value}
              onClick={() => toggle(i.value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-aurora bg-aurora/20 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {i.emoji} {i.label}
            </button>
          );
        })}
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {matches.map((m, idx) => (
          <motion.div
            key={m.name}
            layout
            className="card-glow overflow-hidden"
          >
            <div
              className="relative h-40 bg-cover bg-center"
              style={{ backgroundImage: `url(${m.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
              <div className="absolute right-3 top-3 rounded-full bg-black/40 px-3 py-1 text-sm font-bold text-teal-glow backdrop-blur">
                {m.score}%
              </div>
              <div className="absolute bottom-3 left-4">
                <p className="font-display text-xl font-semibold">{m.name}</p>
                <p className="text-xs text-white/60">{m.country}</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-white/55">{m.reason}</p>
              <Link
                href={`/plan?destination=${encodeURIComponent(m.name)}`}
                className="mt-3 inline-block text-sm font-medium text-aurora-400 hover:text-aurora"
              >
                Plan {m.name} →
              </Link>
            </div>
            {idx === 0 && (
              <div className="absolute left-3 top-3 rounded-full bg-aurora px-2.5 py-0.5 text-xs font-medium shadow-glow">
                Top match
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
