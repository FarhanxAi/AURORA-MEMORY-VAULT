import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#030712",
        foreground: "#F9FAFB",
        aurora: {
          cyan: "#38BDF8",
          teal: "#14B8A6",
          emerald: "#10B981",
          indigo: "#6366F1",
          violet: "#A855F7",
          pink: "#EC4899",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.04)",
          hover: "rgba(255, 255, 255, 0.08)",
          active: "rgba(255, 255, 255, 0.12)",
          border: "rgba(255, 255, 255, 0.10)",
          "border-highlight": "rgba(255, 255, 255, 0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Outfit", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.37)",
        "glass-md": "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
        "glass-lg": "0 16px 48px 0 rgba(0, 0, 0, 0.55)",
        "aurora-glow": "0 0 50px -10px rgba(56, 189, 248, 0.3)",
        "violet-glow": "0 0 50px -10px rgba(168, 85, 247, 0.3)",
      },
      backdropBlur: {
        xs: "4px",
        "2xl": "40px",
        "3xl": "64px",
      },
      animation: {
        "aurora-flow": "auroraFlow 12s ease infinite alternate",
        "pulse-glow": "pulseGlow 6s ease-in-out infinite",
        "float-particle": "floatParticle 8s ease-in-out infinite",
        "shimmer-slide": "shimmerSlide 3s linear infinite",
      },
      keyframes: {
        auroraFlow: {
          "0%": {
            transform: "translate(0%, 0%) scale(1)",
            opacity: "0.5",
          },
          "50%": {
            transform: "translate(-5%, 8%) scale(1.15)",
            opacity: "0.8",
          },
          "100%": {
            transform: "translate(5%, -5%) scale(1.05)",
            opacity: "0.6",
          },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.08)" },
        },
        floatParticle: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-18px) rotate(8deg)" },
        },
        shimmerSlide: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
