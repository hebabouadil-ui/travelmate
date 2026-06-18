import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — deep space + aurora accents
        ink: {
          950: "#05060a",
          900: "#0a0c14",
          800: "#11141f",
          700: "#1a1e2e",
          600: "#262b3d",
        },
        aurora: {
          DEFAULT: "#6d7cff",
          400: "#8a96ff",
          500: "#6d7cff",
          600: "#5562f0",
        },
        teal: {
          glow: "#2dd4bf",
        },
        sun: {
          glow: "#fbbf24",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "aurora-gradient":
          "radial-gradient(60% 60% at 20% 20%, rgba(109,124,255,0.25) 0%, transparent 60%), radial-gradient(50% 50% at 80% 30%, rgba(45,212,191,0.18) 0%, transparent 55%), radial-gradient(60% 60% at 50% 100%, rgba(251,191,36,0.12) 0%, transparent 60%)",
        "glass-sheen":
          "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(109,124,255,0.45)",
        "glass": "0 8px 32px 0 rgba(0,0,0,0.37)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 2.5s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
