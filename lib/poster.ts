import { CanvasRenderingContext2D, createCanvas, loadImage, registerFont } from "canvas";
import fs from "fs";
import path from "path";
import { normalizeTheme, posterPalette } from "@/lib/theme";

type OverlayInput = {
  bgBase64: string;
  title: string;
  subtitle: string;
  price: string;
  cta: string;
  theme: "gold" | "minimal" | "cute";
  aspect: "16:9" | "9:16";
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width <= maxWidth) {
      line = probe;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  align: CanvasTextAlign = "left",
  maxLines?: number,
) {
  ctx.textAlign = align;
  const capped = typeof maxLines === "number" ? lines.slice(0, maxLines) : lines;
  capped.forEach((line, idx) => {
    ctx.fillText(line, x, y + idx * lineHeight);
  });
  return y + (capped.length - 1) * lineHeight;
}

export async function composePoster(input: OverlayInput) {
  const theme = normalizeTheme(input.theme);
  const palette = posterPalette(theme);

  const fontDir = path.join(process.cwd(), "public", "fonts");
  const regularCandidates = ["noto-sans-sc.otf", "NotoSansSC-Regular.otf", "noto-sans.otf", "NotoSans-Regular.ttf"];
  const boldCandidates = ["noto-sans-sc-bold.otf", "NotoSansSC-Bold.otf", "noto-sans-bold.otf", "NotoSans-Bold.ttf"];
  const regularFont = regularCandidates.map((name) => path.join(fontDir, name)).find((p) => fs.existsSync(p));
  const boldFont = boldCandidates.map((name) => path.join(fontDir, name)).find((p) => fs.existsSync(p));
  if (regularFont) registerFont(regularFont, { family: "BazaarBah Sans" });
  if (boldFont) registerFont(boldFont, { family: "BazaarBah Sans", weight: "bold" });

  const fontFamily =
    '"BazaarBah Sans","Noto Sans SC","Noto Sans","PingFang SC","Microsoft YaHei","Arial Unicode MS","Inter","Segoe UI",sans-serif';

  const width = input.aspect === "16:9" ? 1600 : 1080;
  const height = input.aspect === "16:9" ? 900 : 1920;
  const pad = input.aspect === "16:9" ? 86 : 76;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgBuffer = Buffer.from(input.bgBase64, "base64");
  const bg = await loadImage(bgBuffer);
  ctx.drawImage(bg, 0, 0, width, height);

  // Neutral readability shades (remove red-tint full overlay).
  const topShade = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  topShade.addColorStop(0, "rgba(0,0,0,0.30)");
  topShade.addColorStop(1, "rgba(0,0,0,0.05)");
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, width, height * 0.65);

  const bottomShade = ctx.createLinearGradient(0, height * 0.52, 0, height);
  bottomShade.addColorStop(0, "rgba(0,0,0,0.04)");
  bottomShade.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, height * 0.52, width, height * 0.48);

  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;

  const titleFontSize = input.aspect === "16:9" ? 86 : 82;
  const subtitleFontSize = input.aspect === "16:9" ? 40 : 46;
  const ctaFontSize = input.aspect === "16:9" ? 44 : 52;
  const maxTextWidth = width - pad * 2;
  const titleText = input.title.trim();
  const subtitleText = input.subtitle.trim();
  const ctaText = `${input.price}  •  ${input.cta}`.trim();
  const variant = Math.floor(Math.random() * 4);

  if (variant === 0) {
    // Top-left + full width dark CTA.
    ctx.fillStyle = palette.heading;
    ctx.font = `bold ${titleFontSize}px ${fontFamily}`;
    const titleEnd = drawLines(
      ctx,
      wrapTextLines(ctx, titleText, maxTextWidth),
      pad,
      input.aspect === "16:9" ? 170 : 230,
      titleFontSize + 8,
      "left",
      2,
    );

    ctx.fillStyle = palette.subtitle;
    ctx.font = `${subtitleFontSize}px ${fontFamily}`;
    drawLines(ctx, wrapTextLines(ctx, subtitleText, maxTextWidth), pad, titleEnd + 58, subtitleFontSize + 8, "left", 2);

    const h = input.aspect === "16:9" ? 105 : 140;
    const y = height - h - pad;
    const w = width - pad * 2;
    ctx.fillStyle = "rgba(20,27,24,0.90)";
    drawRoundedRect(ctx, pad, y, w, h, 20);
    ctx.fillStyle = palette.heading;
    ctx.font = `bold ${ctaFontSize}px ${fontFamily}`;
    drawLines(ctx, wrapTextLines(ctx, ctaText, w - 52), pad + 26, y + (input.aspect === "16:9" ? 70 : 90), ctaFontSize + 2, "left", 1);
  } else if (variant === 1) {
    // Right aligned headline + right CTA pill.
    ctx.fillStyle = palette.heading;
    ctx.font = `bold ${titleFontSize}px ${fontFamily}`;
    const titleEnd = drawLines(
      ctx,
      wrapTextLines(ctx, titleText, maxTextWidth * 0.76),
      width - pad,
      input.aspect === "16:9" ? 180 : 250,
      titleFontSize + 8,
      "right",
      2,
    );

    ctx.fillStyle = palette.subtitle;
    ctx.font = `${subtitleFontSize}px ${fontFamily}`;
    drawLines(
      ctx,
      wrapTextLines(ctx, subtitleText, maxTextWidth * 0.76),
      width - pad,
      titleEnd + 52,
      subtitleFontSize + 6,
      "right",
      2,
    );

    const w = input.aspect === "16:9" ? 760 : 780;
    const h = input.aspect === "16:9" ? 98 : 124;
    const x = width - pad - w;
    const y = height - h - pad;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    drawRoundedRect(ctx, x, y, w, h, 28);
    ctx.fillStyle = palette.heading;
    ctx.font = `bold ${ctaFontSize}px ${fontFamily}`;
    drawLines(ctx, wrapTextLines(ctx, ctaText, w - 54), x + w / 2, y + (input.aspect === "16:9" ? 64 : 84), ctaFontSize + 2, "center", 1);
  } else if (variant === 2) {
    // Mid-left glass panel + gradient CTA strip.
    const panelX = pad;
    const panelY = input.aspect === "16:9" ? 160 : 220;
    const panelW = input.aspect === "16:9" ? 760 : width - pad * 2;
    const panelH = input.aspect === "16:9" ? 300 : 360;
    ctx.fillStyle = "rgba(8,15,13,0.48)";
    drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 24);

    ctx.fillStyle = palette.heading;
    ctx.font = `bold ${titleFontSize - 6}px ${fontFamily}`;
    const titleEnd = drawLines(ctx, wrapTextLines(ctx, titleText, panelW - 60), panelX + 30, panelY + 84, titleFontSize + 2, "left", 2);

    ctx.fillStyle = palette.subtitle;
    ctx.font = `${subtitleFontSize - 4}px ${fontFamily}`;
    drawLines(ctx, wrapTextLines(ctx, subtitleText, panelW - 60), panelX + 30, titleEnd + 48, subtitleFontSize + 4, "left", 2);

    const h = input.aspect === "16:9" ? 96 : 126;
    const y = height - h - pad;
    const w = width - pad * 2;
    const grad = ctx.createLinearGradient(pad, y, pad + w, y);
    grad.addColorStop(0, "rgba(201,162,39,0.95)");
    grad.addColorStop(1, "rgba(0,194,168,0.90)");
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, pad, y, w, h, 20);
    ctx.fillStyle = "#051513";
    ctx.font = `bold ${ctaFontSize - 2}px ${fontFamily}`;
    drawLines(ctx, wrapTextLines(ctx, ctaText, w - 52), pad + w / 2, y + (input.aspect === "16:9" ? 64 : 82), ctaFontSize + 2, "center", 1);
  } else {
    // Top-left + split price/cta chips.
    ctx.fillStyle = palette.heading;
    ctx.font = `bold ${titleFontSize}px ${fontFamily}`;
    const titleEnd = drawLines(
      ctx,
      wrapTextLines(ctx, titleText, maxTextWidth * 0.82),
      pad,
      input.aspect === "16:9" ? 170 : 230,
      titleFontSize + 8,
      "left",
      2,
    );

    ctx.fillStyle = palette.subtitle;
    ctx.font = `${subtitleFontSize}px ${fontFamily}`;
    drawLines(ctx, wrapTextLines(ctx, subtitleText, maxTextWidth * 0.82), pad, titleEnd + 56, subtitleFontSize + 8, "left", 2);

    const chipH = input.aspect === "16:9" ? 92 : 116;
    const chipY = height - chipH - pad;
    const leftW = Math.floor((width - pad * 3) * 0.42);
    const rightW = width - pad * 3 - leftW;
    ctx.fillStyle = "rgba(15,20,18,0.90)";
    drawRoundedRect(ctx, pad, chipY, leftW, chipH, 18);
    drawRoundedRect(ctx, pad + leftW + pad, chipY, rightW, chipH, 18);
    ctx.fillStyle = palette.heading;
    ctx.font = `bold ${ctaFontSize - 2}px ${fontFamily}`;
    drawLines(ctx, wrapTextLines(ctx, input.price, leftW - 32), pad + leftW / 2, chipY + (input.aspect === "16:9" ? 60 : 78), ctaFontSize, "center", 1);
    drawLines(ctx, wrapTextLines(ctx, input.cta, rightW - 32), pad + leftW + pad + rightW / 2, chipY + (input.aspect === "16:9" ? 60 : 78), ctaFontSize, "center", 1);
  }

  return canvas.toBuffer("image/png").toString("base64");
}

