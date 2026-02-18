import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, type Lang } from "@/lib/i18n";

export async function getLangFromCookie(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}
