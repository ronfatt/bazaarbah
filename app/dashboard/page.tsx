import Link from "next/link";
import { ShoppingBag, Wallet, Clock3, BadgeCheck, Sparkles } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { AppTable, AppTableWrap } from "@/components/ui/AppTable";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/auth";
import { currencyFromCents, formatMonthDayGMT8, startOfDayIsoOffset, startOfTodayIso } from "@/lib/utils";
import { hasUnlockedFeatures, normalizePlanTier, PLAN_AI_CREDITS, PLAN_AI_TOTAL_CREDITS, PLAN_LABEL } from "@/lib/plan";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

function statusVariant(status: string): "pending" | "paid" | "cancelled" | "neutral" {
  if (status === "paid") return "paid";
  if (status === "cancelled") return "cancelled";
  if (status === "pending_payment" || status === "proof_submitted") return "pending";
  return "neutral";
}

export default async function DashboardPage() {
  const lang = await getLangFromCookie();
  const { user, profile } = await requireSeller();
  const unlocked = hasUnlockedFeatures(profile);
  const aiEnabled = true;
  const tier = normalizePlanTier(profile);
  const admin = createAdminClient();

  const [{ data: shops }, { data: notices }] = await Promise.all([
    admin.from("shops").select("id,slug,shop_name").eq("owner_id", user.id),
    admin
      .from("member_notices")
      .select("id,title,body,type,scope,created_at")
      .eq("is_active", true)
      .or(`scope.eq.all,and(scope.eq.user,user_id.eq.${user.id})`)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const shopIds = shops?.map((s) => s.id) ?? [];

  type DashboardOrder = { id: string; order_code: string; status: string; buyer_name: string | null; subtotal_cents: number; created_at: string };
  let orders: DashboardOrder[] = [];
  const primaryOrders = await admin
    .from("orders")
    .select("id,order_code,status,buyer_name,subtotal_cents,created_at,shops!inner(owner_id)")
    .eq("shops.owner_id", user.id)
    .order("created_at", { ascending: false });
  if (primaryOrders.error) {
    if (shopIds.length) {
      const fallbackOrders = await admin
        .from("orders")
        .select("id,order_code,status,buyer_name,subtotal_cents,created_at")
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false });
      orders = (fallbackOrders.data as DashboardOrder[] | null) ?? [];
    } else {
      orders = [];
    }
  } else {
    orders = (primaryOrders.data as unknown as DashboardOrder[] | null) ?? [];
  }

  const todayIso = startOfTodayIso();
  const todayOrders = orders.filter((o) => o.created_at >= todayIso).length;
  const totalSales = orders.filter((o) => o.status === "paid").reduce((acc, o) => acc + o.subtotal_cents, 0);
  const pending = orders.filter((o) => o.status === "pending_payment" || o.status === "proof_submitted").length;
  const paid = orders.filter((o) => o.status === "paid").length;

  const weekly = Array.from({ length: 7 }, (_, i) => {
    const offset = -(6 - i);
    const startIso = startOfDayIsoOffset(offset);
    const nextIso = startOfDayIsoOffset(offset + 1);
    const sales =
      orders
        .filter((o) => o.status === "paid" && o.created_at >= startIso && o.created_at < nextIso)
        .reduce((acc, o) => acc + o.subtotal_cents, 0);
    return { day: formatMonthDayGMT8(startIso), sales };
  });

  const recentOrders = orders.slice(0, 6);
  const hasShop = shopIds.length > 0;
  const includedCredits = PLAN_AI_CREDITS[tier];
  const includedTotalCredits = PLAN_AI_TOTAL_CREDITS[tier];

  return (
    <div className="grid grid-cols-12 gap-6">
      {(notices?.length ?? 0) > 0 && (
        <div className="col-span-12">
          <AppCard className="p-5">
            <p className="text-xs uppercase tracking-widest text-white/45">{t(lang, "dashboard.notices")}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {(notices ?? []).map((notice) => (
                <div key={notice.id} className="rounded-xl border border-white/10 bg-[#163C33] p-3">
                  <p className="text-xs text-white/45">{notice.type === "warning" ? t(lang, "dashboard.warning") : t(lang, "dashboard.announcement")}</p>
                  <p className="mt-1 font-semibold text-white">{notice.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-white/70">{notice.body}</p>
                </div>
              ))}
            </div>
          </AppCard>
        </div>
      )}

      <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={t(lang, "dashboard.today_orders")} value={String(todayOrders)} trend={12} icon={ShoppingBag} accent="teal" />
        <KpiCard title={t(lang, "dashboard.total_sales")} value={currencyFromCents(totalSales)} trend={9} icon={Wallet} accent="gold" />
        <KpiCard title={t(lang, "dashboard.pending")} value={String(pending)} trend={-4} icon={Clock3} accent="yellow" />
        <KpiCard title={t(lang, "dashboard.paid")} value={String(paid)} trend={11} icon={BadgeCheck} accent="green" />
      </div>

      <div className="col-span-12 space-y-5 xl:col-span-8">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/45">{t(lang, "dashboard.workspace")}</p>
              <h1 className="mt-1 text-2xl font-bold">{t(lang, "dashboard.welcome_named")} {profile.display_name ?? t(lang, "common.seller")}</h1>
              <p className="mt-2 text-sm text-white/65">{t(lang, "dashboard.setup_quick")}</p>
            </div>
            <Badge variant="ai">{t(lang, "dashboard.ai_ready")}</Badge>
          </div>

          {!unlocked && (
            <div className="mt-5 rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-4">
              <p className="text-sm font-semibold text-bb-text">{t(lang, "dashboard.free_title")}</p>
              <p className="mt-1 text-sm text-white/65">{t(lang, "dashboard.free_desc")}</p>
              <div className="mt-4">
                <Link href="/dashboard/billing">
                  <AppButton variant="primary">{t(lang, "dashboard.upgrade_now")}</AppButton>
                </Link>
              </div>
            </div>
          )}

          {!hasShop && (
            <div className="mt-5 rounded-xl border border-bb-ai/15 bg-bb-surface2/40 p-4">
              <p className="text-sm font-semibold">{t(lang, "dashboard.setup_checklist")}</p>
              <ul className="mt-2 space-y-1 text-sm text-white/65">
                <li>{t(lang, "dashboard.step1")}</li>
                <li>{t(lang, "dashboard.step2")}</li>
                <li>{t(lang, "dashboard.step3")}</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <Link href="/dashboard/shop">
                  <AppButton variant="primary">{t(lang, "dashboard.create_shop")}</AppButton>
                </Link>
                <Link href="/dashboard/products">
                  <AppButton variant="secondary">{t(lang, "dashboard.add_product")}</AppButton>
                </Link>
              </div>
            </div>
          )}

          {hasShop && (
            <div className="mt-5">
              <p className="text-sm font-semibold">{t(lang, "dashboard.weekly_sales")}</p>
              <div className="mt-3">
                <SalesChart data={weekly} />
              </div>
            </div>
          )}
        </AppCard>

        <AppCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t(lang, "dashboard.recent_orders")}</h2>
            <Link href="/dashboard/orders" className="text-sm text-bb-gold hover:underline">
              {t(lang, "dashboard.view_all")}
            </Link>
          </div>

          <AppTableWrap>
            <AppTable>
              <thead className="bg-bb-surface2/70 text-white/45">
                <tr>
                  <th className="px-4 py-3">{t(lang, "dashboard.order")}</th>
                  <th className="px-4 py-3">{t(lang, "dashboard.buyer")}</th>
                  <th className="px-4 py-3">{t(lang, "dashboard.status")}</th>
                  <th className="px-4 py-3">{t(lang, "dashboard.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-bb-border/5 hover:bg-bb-surface2/50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/dashboard/orders/${o.id}`} className="text-bb-gold">
                        {o.order_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.buyer_name ?? t(lang, "common.guest")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">{currencyFromCents(o.subtotal_cents)}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-white/45">
                      {t(lang, "dashboard.no_orders")}
                    </td>
                  </tr>
                )}
              </tbody>
            </AppTable>
          </AppTableWrap>
        </AppCard>
      </div>

      <div className="col-span-12 space-y-5 xl:col-span-4 xl:sticky xl:top-24 xl:self-start">
        <AppCard className="p-6 bg-[#16423A]/55">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-bb-ai" />
            <h3 className="text-lg font-semibold">{t(lang, "dashboard.ai_shortcuts")}</h3>
          </div>
          <p className="mt-2 text-sm text-white/65">
            {aiEnabled ? t(lang, "dashboard.ai_shortcuts_desc_on") : t(lang, "dashboard.ai_shortcuts_desc_off")}
          </p>
          <div className="mt-4 space-y-2">
            {aiEnabled ? (
              <>
                <Link href="/dashboard/ai" className="block">
                  <AppButton variant="ai" className="w-full justify-start">
                    {t(lang, "dashboard.product_bg")}
                  </AppButton>
                </Link>
                <Link href="/dashboard/ai" className="block">
                  <AppButton variant="ai" className="w-full justify-start">
                    {t(lang, "dashboard.poster_generator")}
                  </AppButton>
                </Link>
                <Link href="/dashboard/ai" className="block">
                  <AppButton variant="ai" className="w-full justify-start">
                    {t(lang, "dashboard.copy_bundle")}
                  </AppButton>
                </Link>
              </>
            ) : (
              <Link href="/dashboard/billing" className="block">
                <AppButton variant="primary" className="w-full">
                  {t(lang, "dashboard.upgrade_plan")}
                </AppButton>
              </Link>
            )}
          </div>
        </AppCard>

        <AppCard className="p-6 bg-[#16423A]/55">
          <h3 className="text-lg font-semibold">{t(lang, "dashboard.credits_meter")}</h3>
          <p className="mt-2 text-sm text-white/65">{t(lang, "dashboard.current_plan")} {PLAN_LABEL[tier]}</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-bb-surface2/60 p-3">
              <span className="text-white/65">AI Total</span>
              <span className="font-semibold">
                {profile.ai_credits ?? 0}/{includedTotalCredits}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-bb-surface2/60 p-3">
              <span className="text-white/65">Copy / Image / Poster</span>
              <span className="font-semibold">
                {includedCredits.copy} / {includedCredits.image} / {includedCredits.poster}
              </span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
