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
  keySellingPoints: string;
  price: string;
  platform: "FB" | "IG" | "TikTok" | "WhatsApp";
  lang?: "en" | "zh" | "ms";
}) {
  const client = getClient();

  const languageInstruction =
    input.lang === "zh"
      ? "Write in Simplified Chinese only."
      : input.lang === "ms"
        ? "Write in Bahasa Melayu only."
        : "Write in English only.";

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
        content: `Generate marketing bundle for: ${input.productName}\nSelling points: ${input.keySellingPoints}\nPrice: ${input.price}\nTarget platform: ${input.platform}\nOutput JSON shape: {\"fbCaptions\":[{\"tone\":\"friendly\"|\"urgent\"|\"premium\",\"text\":\"...\"}],\"whatsappBroadcasts\":[\"...\",\"...\",\"...\"],\"hooks\":[\"...\",\"...\",\"...\",\"...\",\"...\"]}`,
      },
    ],
  });

  const raw = response.output_text;
  return JSON.parse(raw) as {
    fbCaptions: Array<{ tone: "friendly" | "urgent" | "premium"; text: string }>;
    whatsappBroadcasts: string[];
    hooks: string[];
  };
}

export async function generateBackgroundImage(input: {
  title: string;
  description?: string;
  style: "gold" | "minimal" | "cute";
  aspect: "16:9" | "9:16";
}) {
  const client = getClient();
  const theme = normalizeTheme(input.style) as ShopTheme;
  const size = input.aspect === "16:9" ? "1536x1024" : "1024x1536";

  const styleHint =
    theme === "gold"
      ? "Raya luxury ambience, deep green and gold accents"
      : theme === "cute"
        ? "soft pastel festive mood, warm cute composition"
        : "clean modern minimal product staging";

  const prompt = [
    "Create an ultra-clean product-photo background with NO text, NO letters, NO logo.",
    "Leave central negative space for later typography overlay.",
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
    "Professional food product photography of the SAME dessert shown in the reference image.",
    "Keep the dessert's shape, texture, and colors accurate.",
    "Remove messy background and distractions.",
    "Place the dessert on a clean plate or minimal surface.",
    "Soft diffused studio lighting, natural shadows, high-end commercial food photo, sharp focus on dessert, realistic, no text, no watermark, no logo.",
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
