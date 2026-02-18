import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";

function getClient() {
  const { openAiApiKey } = getServerEnv();
  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required for AI features");
  }
  return new OpenAI({ apiKey: openAiApiKey });
}

export async function generateAdCopy(input: {
  storeName: string;
  productName: string;
  productDescription: string;
  price: string;
}) {
  const client = getClient();
  const completion = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You are a copywriter for festive kuih sellers. Output concise social-ready copy in English + Bahasa Melayu, with CTA and emoji-light tone.",
      },
      {
        role: "user",
        content: `Store: ${input.storeName}\nProduct: ${input.productName}\nDescription: ${input.productDescription}\nPrice: ${input.price}`,
      },
    ],
  });

  return completion.output_text;
}

export async function generatePosterBackground(prompt: string) {
  const client = getClient();
  const image = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
  });

  const base64 = image.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("No image data returned from OpenAI");
  }

  return base64;
}
