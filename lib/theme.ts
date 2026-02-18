export type ShopTheme = "gold" | "minimal" | "cute";

export const themeTokens: Record<ShopTheme, {
  page: string;
  card: string;
  accent: string;
  accentSoft: string;
  text: string;
}> = {
  gold: {
    page: "from-[#0B3D2E] via-[#0f4f3a] to-[#1d5f4a]",
    card: "bg-[#0f3f30]/90 border-[#D4AF37]/40",
    accent: "#D4AF37",
    accentSoft: "#f2df9e",
    text: "text-emerald-50",
  },
  minimal: {
    page: "from-[#F7F7F7] via-[#ffffff] to-[#eef2f7]",
    card: "bg-white/95 border-[#d1d5db]",
    accent: "#1F2937",
    accentSoft: "#9ca3af",
    text: "text-[#1F2937]",
  },
  cute: {
    page: "from-[#FFFBEB] via-[#fff5f8] to-[#ffe6ef]",
    card: "bg-white/90 border-[#FB7185]/35",
    accent: "#FB7185",
    accentSoft: "#fecdd3",
    text: "text-[#7f1d4f]",
  },
};

export function normalizeTheme(value: string | null | undefined): ShopTheme {
  if (value === "gold" || value === "minimal" || value === "cute") return value;
  return "gold";
}

export function posterPalette(theme: ShopTheme) {
  if (theme === "minimal") {
    return {
      overlay: "rgba(15,23,42,0.35)",
      heading: "#f8fafc",
      subtitle: "#e5e7eb",
      ctaBg: "#f3f4f6",
      ctaText: "#111827",
    };
  }

  if (theme === "cute") {
    return {
      overlay: "rgba(127,29,79,0.30)",
      heading: "#fff1f7",
      subtitle: "#ffe4ef",
      ctaBg: "#FB7185",
      ctaText: "#fff7fb",
    };
  }

  return {
    overlay: "rgba(0,0,0,0.42)",
    heading: "#fff8e8",
    subtitle: "#ffffff",
    ctaBg: "#D4AF37",
    ctaText: "#1f1500",
  };
}
