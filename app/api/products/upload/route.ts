import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertActiveSellerByUserId } from "@/lib/auth";
import { ensurePublicBucket } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertActiveSellerByUserId(user.id);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const admin = createAdminClient();
    await ensurePublicBucket(admin, "product-images", MAX_BYTES);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/product-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error } = await admin.storage.from("product-images").upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data } = admin.storage.from("product-images").getPublicUrl(path);
    return NextResponse.json({ imageUrl: data.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
