import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { getServerEnv } from "@/lib/env";
import { normalizeTheme, type ShopTheme } from "@/lib/theme";

function getClient() {
  const { openAiApiKey } = getServerEnv();
  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required for AI features");
  }
  return new OpenAI({ apiKey: openAiApiKey });
}

export async function generateMarketingCopy(input: {
  productName: string;
  keySellingPoints?: string;
  price: string;
  platform?: "FB" | "IG" | "TikTok" | "WhatsApp";
  lang?: "en" | "zh" | "ms";
  mode?: "full_bundle" | "poster_fields";
  toneStyle?: "flash_sale" | "raya_premium" | "elegant_luxury" | "bazaar_santai" | "hard_selling";
}) {
  const client = getClient();

  const languageInstruction =
    input.lang === "zh"
      ? "Write in Simplified Chinese only."
      : input.lang === "ms"
        ? "Write in Bahasa Melayu only."
        : "Write in English only.";

  const toneInstruction =
    input.toneStyle === "flash_sale"
      ? "Tone: fast urgency, promo-heavy."
      : input.toneStyle === "raya_premium"
        ? "Tone: warm festive premium Raya."
        : input.toneStyle === "elegant_luxury"
          ? "Tone: elegant and premium."
          : input.toneStyle === "bazaar_santai"
            ? "Tone: friendly bazaar casual."
            : input.toneStyle === "hard_selling"
              ? "Tone: direct hard-sell CTA."
              : "Tone: balanced and sales-friendly.";

  const mode = input.mode ?? "full_bundle";
  const userPrompt =
    mode === "poster_fields"
      ? `Generate poster marketing fields for:
Product: ${input.productName}
Price: ${input.price}
Selling points: ${input.keySellingPoints ?? "-"}
${toneInstruction}
Output JSON shape: {"title":"...","subtitle":"...","cta":"...","promoLine":"...","bullets":["...","...","..."]}`
      : `Generate marketing bundle for: ${input.productName}
Selling points: ${input.keySellingPoints ?? "-"}
Price: ${input.price}
Target platform: ${input.platform ?? "FB"}
${toneInstruction}
Output JSON shape: {"fbCaptions":[{"tone":"friendly"|"urgent"|"premium","text":"..."}],"whatsappBroadcasts":["...","...","..."],"hooks":["...","...","...","...","..."]}`;

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          `Return valid JSON only. ${languageInstruction} Keep concise and sales-friendly.`,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const raw = response.output_text.trim();
  const normalized = raw.startsWith("```") ? raw.replace(/^```json\s*|^```\s*|```$/g, "").trim() : raw;
  return JSON.parse(normalized) as
    | {
        fbCaptions: Array<{ tone: "friendly" | "urgent" | "premium"; text: string }>;
        whatsappBroadcasts: string[];
        hooks: string[];
      }
    | {
        title: string;
        subtitle: string;
        cta: string;
        promoLine: string;
        bullets: string[];
      };
}

export async function generateBackgroundImage(input: {
  title: string;
  description?: string;
  style: "gold" | "minimal" | "cute";
  aspect: "16:9" | "9:16" | "1:1";
}) {
  const client = getClient();
  const theme = normalizeTheme(input.style) as ShopTheme;
  const size = input.aspect === "16:9" ? "1536x1024" : input.aspect === "1:1" ? "1024x1024" : "1024x1536";

  const styleHint =
    theme === "gold"
      ? "Raya luxury ambience, deep green and gold accents"
      : theme === "cute"
        ? "soft pastel festive mood, warm cute composition"
        : "clean modern minimal product staging";

  const prompt = [
    "Create an ultra-clean product-photo background only with NO text, NO letters, NO logo.",
    "This is background-only output: do NOT render any food, dessert, plate, packaging, or product object.",
    "Leave clear negative space for later product placement and typography overlay.",
    `${styleHint}.`,
    `Subject: ${input.title}.`,
    input.description ? `Details: ${input.description}.` : "",
    "High quality studio lighting, food commercial photography mood.",
  ]
    .filter(Boolean)
    .join(" ");

  const image = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
  });

  const base64 = image.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("No image data returned from OpenAI");
  }

  return { base64, prompt };
}

export async function generateProductDescription(input: {
  productName: string;
  price?: string;
  keySellingPoints?: string;
  lang?: "en" | "zh" | "ms";
}) {
  const client = getClient();
  const languageInstruction =
    input.lang === "zh"
      ? "Write in Simplified Chinese."
      : input.lang === "ms"
        ? "Write in Bahasa Melayu."
        : "Write in English.";
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          `${languageInstruction} Write a concise ecommerce product description in plain text only. 2-4 short sentences, sales-friendly, no hashtags, no markdown.`,
      },
      {
        role: "user",
        content: `Product: ${input.productName}\nPrice: ${input.price ?? "-"}\nSelling points: ${
          input.keySellingPoints ?? "-"
        }\nReturn a single paragraph.`,
      },
    ],
  });
  return response.output_text.trim();
}

export async function enhanceProductPhoto(input: {
  imageBytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  productName: string;
  description?: string;
  style: "studio" | "raya" | "premium";
  outputSize?: "1024x1024" | "1024x1536" | "1536x1024";
}) {
  const client = getClient();

  const styleAddon =
    input.style === "raya"
      ? "Subtle Raya festive mood: warm bokeh lights, ketupat motif very subtle, green-gold accents, not distracting, keep focus on dessert."
      : input.style === "premium"
        ? "Dark luxury background, soft rim light, elegant green-gold accent, premium boutique dessert photo."
        : "Clean white/cream studio background, minimal props, premium catalog style.";

  const prompt = [
    "Professional food product photography edit of the SAME exact dessert shown in the reference image.",
    "Identity lock: preserve exact product identity, exact shape silhouette, exact texture pattern, and original color tones.",
    "Quantity lock: preserve the same number of pieces as the reference. Do not add or remove pieces.",
    "Composition lock: keep similar camera angle and scale. Do not morph or redesign the dessert form.",
    "Only clean the environment: remove messy background/distractions and restage with clean surface and better lighting.",
    "Soft diffused studio lighting, natural shadows, high-end commercial food photo, realistic, sharp focus on dessert, no text, no watermark, no logo.",
    styleAddon,
    input.description ? `Product notes: ${input.description}.` : "",
    `Product name: ${input.productName}.`,
    "Do not change the dessert into a different item. Do not add extra desserts. No people, no hands, no text.",
  ]
    .filter(Boolean)
    .join(" ");

  const source = await toFile(Buffer.from(input.imageBytes), "product-source.png", { type: input.mimeType });
  const image = await client.images.edit({
    model: "gpt-image-1",
    image: source,
    prompt,
    size: input.outputSize ?? "1024x1024",
  });

  const base64 = image.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("No image data returned from OpenAI");
  }

  return { base64, prompt, model: "gpt-image-1" as const };
}

export async function generatePosterCopyV3(input: {
  productName: string;
  priceText: string;
  description?: string;
  festival: "generic" | "ramadan" | "raya" | "cny" | "deepavali" | "christmas" | "valentine" | "birthday" | "none";
  objective: "flash_sale" | "new_launch" | "preorder" | "limited" | "bundle" | "free_delivery" | "whatsapp";
  style: "premium" | "festive" | "minimal" | "retail" | "cute";
  locale: "en" | "ms" | "zh";
  shopName?: string;
  whatsapp?: string;
  orderLink?: string;
}) {
  const client = getClient();
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You are a performance marketing copywriter for Malaysian F&B sellers. Return ONLY valid JSON. No markdown.",
      },
      {
        role: "user",
        content: `Generate marketing copy for a social media poster.
Product: ${input.productName}
Price: ${input.priceText}
Description: ${input.description ?? "-"}
Festival: ${input.festival}
Objective: ${input.objective}
Style: ${input.style}
Locale: ${input.locale}
Shop name: ${input.shopName ?? "-"}
WhatsApp: ${input.whatsapp ?? "-"}
Order link: ${input.orderLink ?? "-"}

Constraints:
- Headline: max 6 words
- Subheadline: max 10 words
- 3 bullets: each max 6 words
- CTA: 2-3 words
- Footer: short, include WhatsApp/order hint if provided
- Mention price naturally
- Language:
  ms: Bahasa Melayu (simple)
  en: English
  zh: 简体中文（口语广告风）

Return JSON:
{
  "headline":"...",
  "subheadline":"...",
  "bullets":["...","...","..."],
  "cta":"...",
  "priceText":"${input.priceText}",
  "footer":"..."
}`,
      },
    ],
  });
  const raw = response.output_text.trim();
  const normalized = raw.startsWith("```") ? raw.replace(/^```json\s*|^```\s*|```$/g, "").trim() : raw;
  return JSON.parse(normalized) as {
    headline: string;
    subheadline?: string;
    bullets?: string[];
    cta: string;
    priceText: string;
    footer?: string;
  };
}

export async function generatePosterBackgroundV3(input: {
  productName: string;
  description?: string;
  festival: string;
  objective: string;
  style: "premium" | "festive" | "minimal" | "retail" | "cute";
  ratio: "9:16" | "1:1" | "4:5";
}) {
  const client = getClient();
  const size = input.ratio === "1:1" ? "1024x1024" : "1024x1536";
  const prompt = `Create a high-end marketing poster background for:
Product: ${input.productName} (Kuih / dessert)
Festival: ${input.festival}
Style: ${input.style}
Objective: ${input.objective}
Ratio: ${input.ratio}
Description: ${input.description ?? "-"}

Rules:
- NO text, NO typography, NO numbers, NO logo, NO watermark.
- Create strong negative space at top for headline.
- Create clean bottom area for price + CTA badge.
- Product hero area should be center-right or center.
- Background must feel like an advertisement.
- Cinematic lighting, bokeh, festive props subtly.
- Ensure readability: darker overlay areas for text zones.`;

  const image = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
  });
  const base64 = image.data?.[0]?.b64_json;
  if (!base64) throw new Error("No image data returned from OpenAI");
  return { base64, prompt, model: "gpt-image-1" as const };
}
