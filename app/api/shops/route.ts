import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { assertUnlockedByUserId } from "@/lib/auth";

const createSchema = z.object({
  shopName: z.string().min(2),
  slug: z.string().min(2).optional(),
  phoneWhatsapp: z.string().min(6),
  addressText: z.string().max(240).optional(),
  theme: z.enum(["gold", "minimal", "cute"]).default("gold"),
  logoUrl: z.string().url().optional(),
});

const updateSchema = z.object({
  shopId: z.string().uuid(),
  shopName: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  phoneWhatsapp: z.string().min(6).optional(),
  addressText: z.string().max(240).nullable().optional(),
  theme: z.enum(["gold", "minimal", "cute"]).optional(),
  logoUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("shops").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ shops: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertUnlockedByUserId(user.id);
    const body = createSchema.parse(await req.json());
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("shops")
      .insert({
        owner_id: user.id,
        shop_name: body.shopName,
        slug: slugify(body.slug ?? body.shopName),
        phone_whatsapp: body.phoneWhatsapp,
        address_text: body.addressText ?? null,
        theme: body.theme,
        logo_url: body.logoUrl ?? null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ shop: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertUnlockedByUserId(user.id);
    const body = updateSchema.parse(await req.json());
    const admin = createAdminClient();

    const patch: Record<string, unknown> = {};
    if (body.shopName !== undefined) patch.shop_name = body.shopName;
    if (body.slug !== undefined) patch.slug = slugify(body.slug);
    if (body.phoneWhatsapp !== undefined) patch.phone_whatsapp = body.phoneWhatsapp;
    if (body.addressText !== undefined) patch.address_text = body.addressText;
    if (body.theme !== undefined) patch.theme = body.theme;
    if (body.logoUrl !== undefined) patch.logo_url = body.logoUrl;
    if (body.isActive !== undefined) patch.is_active = body.isActive;

    const { data, error } = await admin
      .from("shops")
      .update(patch)
      .eq("id", body.shopId)
      .eq("owner_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ shop: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
