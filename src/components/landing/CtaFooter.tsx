"use client";

import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { Reveal } from "../Reveal";

export function CtaFooter() {
  return (
    <footer className="relative mx-auto max-w-6xl px-4 pb-12">
      <Reveal>
        <div className="card-glow relative overflow-hidden rounded-[2rem] px-6 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-aurora-gradient opacity-70" />
          <div className="relative z-10">
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Your next trip is one click away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/60">
              Generate a complete, route-optimized itinerary for anywhere in the
              world — free, no account required.
            </p>
            <Link href="/plan" className="btn btn-primary mt-8 px-8 py-3 text-base">
              Generate My Trip <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Reveal>

      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/40 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-aurora/80">
            <Compass className="h-3.5 w-3.5" />
          </span>
          <span>Voyage AI · Built on OpenStreetMap, Open-Meteo, Wikipedia & Gemini</span>
        </div>
        <p>© {new Date().getFullYear()} Voyage AI. Free & open by design.</p>
      </div>
    </footer>
  );
}
