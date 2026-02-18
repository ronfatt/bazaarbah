import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { composePoster } from "@/lib/poster";
import { createClient } from "@/lib/supabase/server";
import { consumeCredit } from "@/lib/credits";

const schema = z.object({
  bgBase64: z.string().min(8),
  title: z.string().min(2),
  subtitle: z.string().min(2),
  price: z.string().min(1),
  cta: z.string().min(1),
  shopId: z.string().uuid().optional(),
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
    const posterBase64 = await composePoster(body);
    const prompt = `${body.title} | ${body.subtitle} | ${body.price} | ${body.cta}`;
    const credits = await consumeCredit({ ownerId: user.id, type: "poster", prompt, shopId: body.shopId ?? null });
    return NextResponse.json({ posterBase64, credits });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to compose poster" }, { status: 400 });
  }
}
