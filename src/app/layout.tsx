import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Voyage AI — Your Personal AI Travel Concierge",
    template: "%s · Voyage AI",
  },
  description:
    "Generate intelligent, route-optimized travel itineraries for anywhere in the world. Hidden gems, restaurants, weather and budget — powered by AI, built on free and open data.",
  keywords: [
    "AI travel planner",
    "itinerary generator",
    "trip planner",
    "travel concierge",
    "route optimization",
  ],
  openGraph: {
    title: "Voyage AI — Your Personal AI Travel Concierge",
    description:
      "Intelligent, route-optimized itineraries for anywhere in the world.",
    type: "website",
    url: APP_URL,
  },
  twitter: { card: "summary_large_image", title: "Voyage AI" },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} dark`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
