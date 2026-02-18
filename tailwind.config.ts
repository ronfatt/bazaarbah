import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bb: {
          bg: "rgb(var(--bg) / <alpha-value>)",
          surface: "rgb(var(--surface) / <alpha-value>)",
          surface2: "rgb(var(--surface2) / <alpha-value>)",
          border: "rgb(var(--border) / <alpha-value>)",
          text: "rgb(var(--text) / <alpha-value>)",
          muted: "rgb(var(--muted) / <alpha-value>)",
          brand: "rgb(var(--brand) / <alpha-value>)",
          gold: "rgb(var(--gold) / <alpha-value>)",
          ai: "rgb(var(--ai) / <alpha-value>)",
        },
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.35)",
        glowAI: "0 0 40px rgba(0,194,168,0.12)",
        glowGold: "0 0 40px rgba(201,162,39,0.10)",
      },
    },
  },
};

export default config;
