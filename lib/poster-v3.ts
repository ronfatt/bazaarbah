import { CanvasRenderingContext2D, createCanvas, loadImage, registerFont } from "canvas";
import fs from "fs";
import path from "path";
import {
  getPosterPreset,
  listPosterPresets,
  posterSizeByRatio,
  type PosterLayout,
  type PosterPresetName,
  type PosterRatio,
} from "@/lib/poster-presets";

export type PosterStyle = "premium" | "festive" | "minimal" | "retail" | "cute";

export type PosterRenderInput = {
  ratio: PosterRatio;
  preset?: PosterPresetName;
  backgroundBuffer: Buffer;
  headline: string;
  subheadline?: string | null;
  bullets?: string[];
  priceText: string;
  cta: string;
  footer?: string | null;
  style?: PosterStyle;
  heroImageBuffer?: Buffer;
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const probe = current ? `${current} ${word}` : word;
    if (ctx.measureText(probe).width <= maxWidth) {
      current = probe;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "BazaarBah Sans","Noto Sans SC","Noto Sans","PingFang SC","Microsoft YaHei","Arial Unicode MS","Inter","Segoe UI",sans-serif`;
}

function fitTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  maxLines: number,
  weight = 700,
) {
  let size = initialSize;
  let lines: string[] = [];
  while (size >= Math.max(24, Math.floor(initialSize * 0.55))) {
    setFont(ctx, size, weight);
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
    size -= 2;
  }
  const truncated = text.length > 80 ? `${text.slice(0, 77)}...` : text;
  setFont(ctx, size, weight);
  return { size, lines: wrapText(ctx, truncated, maxWidth).slice(0, maxLines) };
}

export function choosePosterPreset(input: {
  ratio: PosterRatio;
  style: PosterStyle;
  festival: string;
  objective: string;
  shuffle?: boolean;
  currentPreset?: PosterPresetName | null;
}) {
  const all = listPosterPresets();
  if (input.shuffle) {
    if (!input.currentPreset) return all[Math.floor(Math.random() * all.length)];
    const idx = all.indexOf(input.currentPreset);
    return all[(idx + 1 + Math.floor(Math.random() * (all.length - 1))) % all.length];
  }

  if (input.style === "premium") return "premium_editorial";
  if (input.style === "minimal") return "split_panel";
  if (input.style === "retail") return input.objective === "flash_sale" ? "retail_badge" : "cta_stripe";
  if (input.style === "cute") return "hero_center";
  if (["raya", "ramadan", "cny", "deepavali", "christmas", "valentine"].includes(input.festival)) return "diagonal_energy";
  return "retail_badge";
}

function applyStyleColors(layout: PosterLayout, style: PosterStyle, festival: string) {
  const next = { ...layout };
  if (festival === "cny") next.accentColor = "#F59E0B";
  else if (festival === "valentine") next.accentColor = "#FB7185";
  else if (festival === "deepavali") next.accentColor = "#FBBF24";
  else if (style === "minimal") next.accentColor = "#93C5FD";
  else if (style === "cute") next.accentColor = "#F472B6";
  else next.accentColor = "#D4AF37";
  return next;
}

export async function renderPosterV3(input: PosterRenderInput & { festival: string }) {
  const fontDir = path.join(process.cwd(), "public", "fonts");
  const regularCandidates = ["noto-sans-sc.otf", "NotoSansSC-Regular.otf", "noto-sans.otf", "NotoSans-Regular.ttf"];
  const boldCandidates = ["noto-sans-sc-bold.otf", "NotoSansSC-Bold.otf", "noto-sans-bold.otf", "NotoSans-Bold.ttf"];
  const regularFont = regularCandidates.map((name) => path.join(fontDir, name)).find((p) => fs.existsSync(p));
  const boldFont = boldCandidates.map((name) => path.join(fontDir, name)).find((p) => fs.existsSync(p));
  if (regularFont) registerFont(regularFont, { family: "BazaarBah Sans" });
  if (boldFont) registerFont(boldFont, { family: "BazaarBah Sans", weight: "bold" });

  const size = posterSizeByRatio(input.ratio);
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d");
  const img = await loadImage(input.backgroundBuffer);
  const srcRatio = img.width / img.height;
  const dstRatio = size.width / size.height;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (srcRatio > dstRatio) {
    sw = Math.floor(img.height * dstRatio);
    sx = Math.floor((img.width - sw) / 2);
  } else if (srcRatio < dstRatio) {
    sh = Math.floor(img.width / dstRatio);
    sy = Math.floor((img.height - sh) / 2);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size.width, size.height);

  const layoutBase = getPosterPreset(input.ratio, input.preset ?? "retail_badge");
  const layout = applyStyleColors(layoutBase, input.style ?? "retail", input.festival);

  const overlay = ctx.createLinearGradient(0, 0, 0, size.height * 0.7);
  overlay.addColorStop(0, layout.overlay.from);
  overlay.addColorStop(1, layout.overlay.to);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, size.width, size.height);

  if (input.heroImageBuffer) {
    const hero = await loadImage(input.heroImageBuffer);
    const srcRatioHero = hero.width / hero.height;
    const dstRatioHero = layout.hero.w / layout.hero.h;
    let hsx = 0;
    let hsy = 0;
    let hsw = hero.width;
    let hsh = hero.height;
    if (srcRatioHero > dstRatioHero) {
      hsw = Math.floor(hero.height * dstRatioHero);
      hsx = Math.floor((hero.width - hsw) / 2);
    } else if (srcRatioHero < dstRatioHero) {
      hsh = Math.floor(hero.width / dstRatioHero);
      hsy = Math.floor((hero.height - hsh) / 2);
    }

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "rgba(10,20,17,0.28)";
    drawRoundedRect(ctx, layout.hero.x, layout.hero.y, layout.hero.w, layout.hero.h, 28);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    const r = 28;
    ctx.moveTo(layout.hero.x + r, layout.hero.y);
    ctx.lineTo(layout.hero.x + layout.hero.w - r, layout.hero.y);
    ctx.quadraticCurveTo(layout.hero.x + layout.hero.w, layout.hero.y, layout.hero.x + layout.hero.w, layout.hero.y + r);
    ctx.lineTo(layout.hero.x + layout.hero.w, layout.hero.y + layout.hero.h - r);
    ctx.quadraticCurveTo(layout.hero.x + layout.hero.w, layout.hero.y + layout.hero.h, layout.hero.x + layout.hero.w - r, layout.hero.y + layout.hero.h);
    ctx.lineTo(layout.hero.x + r, layout.hero.y + layout.hero.h);
    ctx.quadraticCurveTo(layout.hero.x, layout.hero.y + layout.hero.h, layout.hero.x, layout.hero.y + layout.hero.h - r);
    ctx.lineTo(layout.hero.x, layout.hero.y + r);
    ctx.quadraticCurveTo(layout.hero.x, layout.hero.y, layout.hero.x + r, layout.hero.y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(hero, hsx, hsy, hsw, hsh, layout.hero.x, layout.hero.y, layout.hero.w, layout.hero.h);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const r2 = 28;
    ctx.moveTo(layout.hero.x + r2, layout.hero.y);
    ctx.lineTo(layout.hero.x + layout.hero.w - r2, layout.hero.y);
    ctx.quadraticCurveTo(layout.hero.x + layout.hero.w, layout.hero.y, layout.hero.x + layout.hero.w, layout.hero.y + r2);
    ctx.lineTo(layout.hero.x + layout.hero.w, layout.hero.y + layout.hero.h - r2);
    ctx.quadraticCurveTo(layout.hero.x + layout.hero.w, layout.hero.y + layout.hero.h, layout.hero.x + layout.hero.w - r2, layout.hero.y + layout.hero.h);
    ctx.lineTo(layout.hero.x + r2, layout.hero.y + layout.hero.h);
    ctx.quadraticCurveTo(layout.hero.x, layout.hero.y + layout.hero.h, layout.hero.x, layout.hero.y + layout.hero.h - r2);
    ctx.lineTo(layout.hero.x, layout.hero.y + r2);
    ctx.quadraticCurveTo(layout.hero.x, layout.hero.y, layout.hero.x + r2, layout.hero.y);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = layout.textColor;

  const headlineFit = fitTextLines(ctx, input.headline, layout.headline.maxW, layout.headline.size, 2, layout.headline.weight ?? 800);
  setFont(ctx, headlineFit.size, layout.headline.weight ?? 800);
  const headlineLh = Math.round(headlineFit.size * (layout.headline.lineHeight ?? 1.14));
  headlineFit.lines.forEach((line, idx) => {
    ctx.fillText(line, layout.headline.x, layout.headline.y + headlineLh * idx);
  });

  if (input.subheadline?.trim()) {
    const subFit = fitTextLines(ctx, input.subheadline.trim(), layout.subheadline.maxW, layout.subheadline.size, 2, layout.subheadline.weight ?? 500);
    setFont(ctx, subFit.size, layout.subheadline.weight ?? 500);
    const subLh = Math.round(subFit.size * (layout.subheadline.lineHeight ?? 1.2));
    subFit.lines.forEach((line, idx) => {
      ctx.fillText(line, layout.subheadline.x, layout.subheadline.y + subLh * idx);
    });
  }

  const bullets = (input.bullets ?? []).filter(Boolean).slice(0, 3);
  if (bullets.length) {
    setFont(ctx, layout.bullets.size, layout.bullets.weight ?? 500);
    const lh = Math.round(layout.bullets.size * (layout.bullets.lineHeight ?? 1.3));
    bullets.forEach((line, idx) => {
      ctx.fillText(`• ${line}`, layout.bullets.x, layout.bullets.y + idx * lh);
    });
  }

  ctx.fillStyle = "rgba(11,31,26,0.72)";
  drawRoundedRect(ctx, layout.priceBadge.x, layout.priceBadge.y, layout.priceBadge.w, layout.priceBadge.h, 26);
  ctx.fillStyle = layout.accentColor;
  drawRoundedRect(ctx, layout.cta.x, layout.cta.y, layout.cta.w, layout.cta.h, 26);

  ctx.fillStyle = "#F8FAFC";
  const priceSize = Math.round(layout.priceBadge.h * 0.42);
  setFont(ctx, priceSize, 800);
  ctx.fillText(input.priceText, layout.priceBadge.x + 26, layout.priceBadge.y + Math.round(layout.priceBadge.h * 0.62));

  ctx.fillStyle = "#051513";
  const ctaSize = Math.round(layout.cta.h * 0.38);
  setFont(ctx, ctaSize, 800);
  const ctaMetrics = ctx.measureText(input.cta);
  ctx.fillText(
    input.cta,
    layout.cta.x + Math.round((layout.cta.w - ctaMetrics.width) / 2),
    layout.cta.y + Math.round(layout.cta.h * 0.62),
  );

  if (input.footer?.trim()) {
    ctx.fillStyle = "rgba(248,250,252,0.9)";
    setFont(ctx, layout.footer.size, 500);
    const footerLines = wrapText(ctx, input.footer.trim(), layout.footer.maxW).slice(0, 2);
    const footerLh = Math.round(layout.footer.size * 1.2);
    footerLines.forEach((line, idx) => {
      ctx.fillText(line, layout.footer.x, layout.footer.y + idx * footerLh);
    });
  }

  return {
    preset: layout.preset,
    layout,
    buffer: canvas.toBuffer("image/png"),
  };
}
