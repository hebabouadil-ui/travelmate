"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { motion } from "framer-motion";

export function SiteNav() {
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4"
    >
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-aurora shadow-glow">
            <Compass className="h-4 w-4" />
          </span>
          Voyage<span className="text-aurora-400">AI</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-white/70 md:flex">
          <Link href="/#features" className="transition hover:text-white">Features</Link>
          <Link href="/#how" className="transition hover:text-white">How it works</Link>
          <Link href="/#match" className="transition hover:text-white">Destinations</Link>
          <Link href="/dashboard" className="transition hover:text-white">Dashboard</Link>
        </div>
        <Link href="/plan" className="btn btn-primary">
          Generate My Trip
        </Link>
      </nav>
    </motion.header>
  );
}
