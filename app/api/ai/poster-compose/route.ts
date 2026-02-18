import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { composePoster } from "@/lib/poster";

const schema = z.object({
  bgBase64: z.string().min(8),
  title: z.string().min(2),
  subtitle: z.string().min(2),
  price: z.string().min(1),
  cta: z.string().min(1),
  theme: z.enum(["gold", "minimal", "cute"]).default("gold"),
  aspect: z.enum(["16:9", "9:16"]).default("9:16"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const posterBase64 = await composePoster({
      bgBase64: body.bgBase64,
      title: body.title,
      subtitle: body.subtitle,
      price: body.price,
      cta: body.cta,
      theme: body.theme,
      aspect: body.aspect,
    });

    return NextResponse.json({ posterBase64 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to compose poster" }, { status: 400 });
  }
}
