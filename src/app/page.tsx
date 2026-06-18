import { SiteNav } from "@/components/SiteNav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MapShowcase } from "@/components/landing/MapShowcase";
import { MatchShowcase } from "@/components/landing/MatchShowcase";
import { CtaFooter } from "@/components/landing/CtaFooter";

export default function HomePage() {
  return (
    <main className="relative">
      <SiteNav />
      <Hero />
      <Features />
      <HowItWorks />
      <MapShowcase />
      <MatchShowcase />
      <CtaFooter />
    </main>
  );
}
