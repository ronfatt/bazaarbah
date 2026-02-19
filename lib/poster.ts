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

export async function composePoster(input: OverlayInput) {
  const theme = normalizeTheme(input.theme);
  const palette = posterPalette(theme);

  const fontDir = path.join(process.cwd(), "public", "fonts");
  const regularFont = path.join(fontDir, "NotoSansSC-Regular.otf");
  const boldFont = path.join(fontDir, "NotoSansSC-Bold.otf");
  if (fs.existsSync(regularFont)) {
    registerFont(regularFont, { family: "Noto Sans SC" });
  }
  if (fs.existsSync(boldFont)) {
    registerFont(boldFont, { family: "Noto Sans SC", weight: "bold" });
  }
  const fontFamily = '"Noto Sans SC","Noto Sans","Arial Unicode MS","Segoe UI",sans-serif';

  const width = input.aspect === "16:9" ? 1600 : 1080;
  const height = input.aspect === "16:9" ? 900 : 1920;
  const pad = input.aspect === "16:9" ? 86 : 76;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgBuffer = Buffer.from(input.bgBase64, "base64");
  const bg = await loadImage(bgBuffer);
  ctx.drawImage(bg, 0, 0, width, height);

  ctx.fillStyle = palette.overlay;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.heading;
  ctx.font = input.aspect === "16:9" ? `bold 90px ${fontFamily}` : `bold 82px ${fontFamily}`;
  ctx.fillText(input.title, pad, input.aspect === "16:9" ? 170 : 230, width - pad * 2);

  ctx.fillStyle = palette.subtitle;
  ctx.font = input.aspect === "16:9" ? `44px ${fontFamily}` : `48px ${fontFamily}`;
  ctx.fillText(input.subtitle, pad, input.aspect === "16:9" ? 245 : 330, width - pad * 2);

  const ctaH = input.aspect === "16:9" ? 120 : 150;
  const ctaY = height - ctaH - pad;
  ctx.fillStyle = palette.ctaBg;
  drawRoundedRect(ctx, pad, ctaY, width - pad * 2, ctaH, 18);

  ctx.fillStyle = palette.ctaText;
  ctx.font = input.aspect === "16:9" ? `bold 52px ${fontFamily}` : `bold 56px ${fontFamily}`;
  ctx.fillText(`${input.price}  •  ${input.cta}`, pad + 26, ctaY + (input.aspect === "16:9" ? 76 : 94), width - pad * 2 - 48);

  return canvas.toBuffer("image/png").toString("base64");
}
