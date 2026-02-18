import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensurePublicBucket(
  admin: SupabaseClient,
  bucket: string,
  maxBytes = 5 * 1024 * 1024,
  allowedMimeTypes: string[] = ["image/jpeg", "image/png", "image/webp"],
) {
  const { data } = await admin.storage.getBucket(bucket);
  if (data) return;
  await admin.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: maxBytes,
    allowedMimeTypes,
  });
}
