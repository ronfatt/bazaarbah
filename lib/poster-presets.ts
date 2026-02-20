export type PosterRatio = "9:16" | "1:1" | "4:5";

export type PosterPresetName =
  | "retail_badge"
  | "hero_center"
  | "split_panel"
  | "premium_editorial"
  | "cta_stripe"
  | "diagonal_energy";

export type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TextBox = {
  x: number;
  y: number;
  maxW: number;
  size: number;
  weight?: number;
  lineHeight?: number;
};

export type PosterLayout = {
  preset: PosterPresetName;
  ratio: PosterRatio;
  textColor: string;
  accentColor: string;
  overlay: { from: string; to: string };
  headline: TextBox;
  subheadline: TextBox;
  bullets: TextBox;
  hero: Box;
  priceBadge: Box;
  cta: Box;
  footer: TextBox;
};

type Dimension = { width: number; height: number };

const ratioDims: Record<PosterRatio, Dimension> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
};

function px(ratio: PosterRatio, x: number, y: number, w: number, h: number): Box {
  const d = ratioDims[ratio];
  return {
    x: Math.round(d.width * x),
    y: Math.round(d.height * y),
    w: Math.round(d.width * w),
    h: Math.round(d.height * h),
  };
}

function tx(ratio: PosterRatio, x: number, y: number, maxW: number, size: number, weight = 700, lineHeight = 1.15): TextBox {
  const d = ratioDims[ratio];
  return {
    x: Math.round(d.width * x),
    y: Math.round(d.height * y),
    maxW: Math.round(d.width * maxW),
    size: Math.round(d.width * size),
    weight,
    lineHeight,
  };
}

export function posterSizeByRatio(ratio: PosterRatio): Dimension {
  return ratioDims[ratio];
}

export function listPosterPresets(): PosterPresetName[] {
  return ["retail_badge", "hero_center", "split_panel", "premium_editorial", "cta_stripe", "diagonal_energy"];
}

export function getPosterPreset(ratio: PosterRatio, preset: PosterPresetName): PosterLayout {
  const base = {
    ratio,
    textColor: "#F8FAFC",
    accentColor: "#D4AF37",
    overlay: { from: "rgba(0,0,0,0.58)", to: "rgba(0,0,0,0.08)" },
  };

  if (preset === "hero_center") {
    return {
      ...base,
      preset,
      headline: tx(ratio, 0.08, 0.08, 0.84, 0.07),
      subheadline: tx(ratio, 0.08, 0.18, 0.8, 0.034, 500),
      bullets: tx(ratio, 0.08, 0.245, 0.7, 0.028, 500, 1.3),
      hero: px(ratio, 0.5, 0.28, 0.42, 0.46),
      priceBadge: px(ratio, 0.08, 0.78, 0.36, 0.075),
      cta: px(ratio, 0.48, 0.78, 0.44, 0.075),
      footer: tx(ratio, 0.08, 0.91, 0.84, 0.024, 500),
    };
  }

  if (preset === "split_panel") {
    return {
      ...base,
      preset,
      headline: tx(ratio, 0.08, 0.1, 0.5, 0.064),
      subheadline: tx(ratio, 0.08, 0.2, 0.48, 0.03, 500),
      bullets: tx(ratio, 0.08, 0.27, 0.46, 0.026, 500, 1.3),
      hero: px(ratio, 0.56, 0.22, 0.36, 0.5),
      priceBadge: px(ratio, 0.08, 0.78, 0.3, 0.07),
      cta: px(ratio, 0.4, 0.78, 0.3, 0.07),
      footer: tx(ratio, 0.08, 0.91, 0.6, 0.022, 500),
    };
  }

  if (preset === "premium_editorial") {
    return {
      ...base,
      preset,
      headline: tx(ratio, 0.1, 0.12, 0.78, 0.06),
      subheadline: tx(ratio, 0.1, 0.22, 0.72, 0.028, 500),
      bullets: tx(ratio, 0.1, 0.29, 0.62, 0.024, 500, 1.3),
      hero: px(ratio, 0.58, 0.3, 0.3, 0.42),
      priceBadge: px(ratio, 0.1, 0.8, 0.28, 0.065),
      cta: px(ratio, 0.42, 0.8, 0.3, 0.065),
      footer: tx(ratio, 0.1, 0.91, 0.74, 0.021, 500),
    };
  }

  if (preset === "cta_stripe") {
    return {
      ...base,
      preset,
      headline: tx(ratio, 0.08, 0.09, 0.84, 0.066),
      subheadline: tx(ratio, 0.08, 0.19, 0.84, 0.03, 500),
      bullets: tx(ratio, 0.08, 0.25, 0.8, 0.025, 500, 1.3),
      hero: px(ratio, 0.5, 0.34, 0.42, 0.42),
      priceBadge: px(ratio, 0.08, 0.82, 0.34, 0.07),
      cta: px(ratio, 0.44, 0.82, 0.48, 0.07),
      footer: tx(ratio, 0.08, 0.92, 0.84, 0.021, 500),
    };
  }

  if (preset === "diagonal_energy") {
    return {
      ...base,
      preset,
      headline: tx(ratio, 0.08, 0.08, 0.7, 0.068),
      subheadline: tx(ratio, 0.08, 0.18, 0.65, 0.03, 500),
      bullets: tx(ratio, 0.08, 0.25, 0.6, 0.024, 500, 1.35),
      hero: px(ratio, 0.52, 0.3, 0.4, 0.46),
      priceBadge: px(ratio, 0.08, 0.79, 0.32, 0.07),
      cta: px(ratio, 0.43, 0.76, 0.49, 0.08),
      footer: tx(ratio, 0.08, 0.915, 0.84, 0.021, 500),
    };
  }

  return {
    ...base,
    preset: "retail_badge",
    headline: tx(ratio, 0.08, 0.08, 0.82, 0.072),
    subheadline: tx(ratio, 0.08, 0.19, 0.75, 0.032, 500),
    bullets: tx(ratio, 0.08, 0.255, 0.72, 0.026, 500, 1.3),
    hero: px(ratio, 0.52, 0.34, 0.4, 0.44),
    priceBadge: px(ratio, 0.08, 0.78, 0.36, 0.075),
    cta: px(ratio, 0.48, 0.78, 0.44, 0.075),
    footer: tx(ratio, 0.08, 0.91, 0.84, 0.023, 500),
  };
}
