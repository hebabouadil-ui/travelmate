"use client";

import {
  Route,
  Gem,
  CloudSun,
  Wallet,
  MapPinned,
  Navigation,
  Sparkles,
  Languages,
} from "lucide-react";
import { Reveal } from "../Reveal";

const FEATURES = [
  {
    icon: Route,
    title: "Smart Route Optimization",
    desc: "Attractions are grouped by neighborhood and ordered to minimize walking — never zig-zag across the city again.",
  },
  {
    icon: Gem,
    title: "Hidden Gems Engine",
    desc: "Goes beyond tourist traps to surface local cafés, viewpoints and authentic neighborhoods.",
  },
  {
    icon: CloudSun,
    title: "Weather-Aware Planning",
    desc: "Live Open-Meteo forecasts flag rain risk and suggest reshuffling your days automatically.",
  },
  {
    icon: Wallet,
    title: "Live Budget Planner",
    desc: "Food, transport and attractions estimated per day so you always know where you stand.",
  },
  {
    icon: MapPinned,
    title: "Interactive Maps",
    desc: "Beautiful OpenStreetMap-powered maps with routes, categorized markers and your live location.",
  },
  {
    icon: Navigation,
    title: "Live GPS Mode",
    desc: "On the ground, discover nearby attractions, restaurants and gems based on where you are right now.",
  },
  {
    icon: Sparkles,
    title: "AI Match Score",
    desc: "Tell us your style and we rank the world's destinations by how well they fit — and explain why.",
  },
  {
    icon: Languages,
    title: "Pluggable AI Layer",
    desc: "Runs on Gemini's free tier today; upgrade to OpenAI or Claude later without rewriting a line.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-4 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          An entire travel team,
          <span className="gradient-text"> in one app</span>
        </h2>
        <p className="mt-4 text-white/60">
          Planner, local guide, route optimizer, budget advisor and concierge —
          working together, powered entirely by free and open services.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 4) * 0.08}>
            <div className="card-glow group h-full p-6 transition-transform duration-300 hover:-translate-y-1">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-aurora/15 text-aurora-400 transition group-hover:bg-aurora/25">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
