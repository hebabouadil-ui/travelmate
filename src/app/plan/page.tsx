import { Suspense } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Planner } from "@/components/plan/Planner";

export const metadata = { title: "Plan your trip" };

export default function PlanPage() {
  return (
    <main className="relative min-h-screen">
      <SiteNav />
      <Suspense fallback={<div className="pt-32 text-center text-white/40">Loading…</div>}>
        <Planner />
      </Suspense>
    </main>
  );
}
