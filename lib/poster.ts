import { createCanvas, loadImage } from "canvas";

type OverlayInput = {
  bgBase64: string;
  title: string;
  subtitle: string;
  price: string;
  cta: string;
};

export async function composePoster(input: OverlayInput) {
  const width = 1080;
  const height = 1350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgBuffer = Buffer.from(input.bgBase64, "base64");
  const bg = await loadImage(bgBuffer);
  ctx.drawImage(bg, 0, 0, width, height);

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#fff8e8";
  ctx.font = "bold 88px sans-serif";
  ctx.fillText(input.title, 72, 200, width - 144);

  ctx.font = "42px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(input.subtitle, 72, 280, width - 144);

  ctx.fillStyle = "#f3b700";
  ctx.fillRect(72, 1040, width - 144, 160);
  ctx.fillStyle = "#231500";
  ctx.font = "bold 68px sans-serif";
  ctx.fillText(`${input.price} · ${input.cta}`, 108, 1145, width - 216);

  return canvas.toBuffer("image/png").toString("base64");
}
