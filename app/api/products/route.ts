import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().max(400).optional(),
  priceCents: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
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
    const body = bodySchema.parse(await req.json());
    const admin = createAdminClient();

    const { data: shop } = await admin.from("shops").select("id").eq("id", body.shopId).eq("owner_id", user.id).maybeSingle();
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("products")
      .insert({
        shop_id: body.shopId,
        name: body.name,
        description: body.description ?? null,
        price_cents: body.priceCents,
        image_url: body.imageUrl ?? null,
        is_available: body.isAvailable ?? true,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ product: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }
}
