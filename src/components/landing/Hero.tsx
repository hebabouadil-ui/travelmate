"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, MapPin, Cloud, Wallet } from "lucide-react";

const floatingCards = [
  { icon: MapPin, label: "Route optimized", sub: "−42% walking", x: "-8%", y: "12%", delay: 0 },
  { icon: Cloud, label: "Rain at 4pm", sub: "Plan adjusted", x: "82%", y: "8%", delay: 0.6 },
  { icon: Wallet, label: "€420 budget", sub: "On track", x: "86%", y: "62%", delay: 1.1 },
];

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pt-28">
      {/* Aurora backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-aurora-gradient" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-aurora/20 blur-[120px]" />

      {/* Floating glass cards */}
      {floatingCards.map((c, i) => (
        <motion.div
          key={i}
          className="absolute hidden lg:block"
          style={{ left: c.x, top: c.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 + c.delay, duration: 0.8 }}
        >
          <div className="glass-strong animate-float rounded-2xl px-4 py-3 shadow-glass" style={{ animationDelay: `${c.delay}s` }}>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-aurora/20 text-aurora-400">
                <c.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-white/50">{c.sub}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/70"
        >
          <Sparkles className="h-3.5 w-3.5 text-aurora-400" />
          Powered by AI · Built on free & open data
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          Your Personal
          <br />
          <span className="gradient-text">AI Travel Concierge</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-balance text-lg text-white/60"
        >
          Tell us where and how you travel. In seconds, get a day-by-day,
          route-optimized itinerary with hidden gems, restaurants, weather and a
          live budget — for anywhere on earth.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link href="/plan" className="btn btn-primary px-7 py-3 text-base">
            Generate My Trip <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#how" className="btn btn-ghost px-7 py-3 text-base">
            See how it works
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 text-xs text-white/40"
        >
          No credit card · No API keys required · Free forever core
        </motion.p>
      </div>
    </section>
  );
}
