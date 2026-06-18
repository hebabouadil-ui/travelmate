"use client";

import { Reveal } from "../Reveal";

const STEPS = [
  {
    n: "01",
    title: "Tell us your style",
    desc: "A quick survey captures your traveler type, interests, food preferences, budget and pace.",
  },
  {
    n: "02",
    title: "Pick a destination & dates",
    desc: "Anywhere in the world. We pull live places, weather and geography behind the scenes.",
  },
  {
    n: "03",
    title: "AI builds your plan",
    desc: "Stops are clustered by area, ordered to cut walking, and narrated by your concierge.",
  },
  {
    n: "04",
    title: "Travel & adapt live",
    desc: "Skip a stop and the route rebuilds. On the ground, GPS mode finds what's nearby.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-4 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          From idea to itinerary in <span className="gradient-text">seconds</span>
        </h2>
      </Reveal>
      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.1}>
            <div className="glass h-full rounded-3xl p-7">
              <span className="font-display text-4xl font-bold text-aurora/50">{s.n}</span>
              <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-white/55">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
