import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "@/components/buyer/checkout-form";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

type SearchParams = Record<string, string | string[] | undefined>;

type EditOrderRow = {
  id: string;
  order_code: string;
  shop_id: string;
  status: "pending_payment" | "proof_submitted" | "paid" | "cancelled";
  buyer_name: string | null;
  buyer_phone: string | null;
};

type EditOrderItemRow = {
  product_id: string;
  qty: number;
};

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const lang = await getLangFromCookie();
  const { slug } = await params;
  const query = await searchParams;
  const admin = createAdminClient();

  const { data: shop } = await admin
    .from("shops")
    .select("id,shop_name,slug,theme,is_active,phone_whatsapp,address_text,logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!shop) notFound();

  let initialCart: string | undefined;
  let initialBuyerName: string | undefined;
  let initialBuyerPhone: string | undefined;
  const editOrderCode = typeof query.editOrder === "string" ? query.editOrder : undefined;

  if (editOrderCode) {
    const { data: editOrderData } = await admin
      .from("orders")
      .select("id,order_code,shop_id,status,buyer_name,buyer_phone")
      .eq("order_code", editOrderCode)
      .maybeSingle();

    const editOrder = editOrderData as EditOrderRow | null;

    if (editOrder && editOrder.shop_id === shop.id && ["pending_payment", "proof_submitted"].includes(editOrder.status)) {
      const { data: editItemsData } = await admin
        .from("order_items")
        .select("product_id,qty")
        .eq("order_id", editOrder.id)
        .order("id", { ascending: true });

      const editItems = (editItemsData ?? []) as EditOrderItemRow[];
      initialCart = editItems.map((item) => `${item.product_id}:${item.qty}`).join(",");
      initialBuyerName = editOrder.buyer_name ?? undefined;
      initialBuyerPhone = editOrder.buyer_phone ?? undefined;
    } else if (typeof query.cart === "string") {
      initialCart = query.cart;
    }
  }

  const { data: products } = await admin
    .from("products")
    .select("id,name,description,price_cents,image_url,image_original_url,image_enhanced_url,image_source,track_stock,stock_qty,sold_out")
    .eq("shop_id", shop.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-neutral-900">
      <header className="bg-[#0E3B2E] text-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center gap-4">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={`${shop.shop_name} logo`}
                className="h-14 w-14 rounded-xl border border-white/20 bg-white/10 object-cover"
              />
            ) : null}
            <h1 className="text-3xl font-bold">{shop.shop_name}</h1>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/90">
            <span className="rounded-full bg-white/15 px-3 py-1">⭐ 4.8 rating</span>
            {shop.address_text ? <span className="rounded-full bg-white/15 px-3 py-1">📍 {shop.address_text}</span> : null}
            <span className="rounded-full bg-white/15 px-3 py-1">🚚 Delivery / Pickup</span>
            {shop.phone_whatsapp ? <span className="rounded-full bg-white/15 px-3 py-1">📱 WhatsApp {shop.phone_whatsapp}</span> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <CheckoutForm
          shopSlug={shop.slug}
          products={(products ?? [])
            .filter((p) => !p.sold_out && (!p.track_stock || Number(p.stock_qty ?? 0) > 0))
            .map((p) => ({
            id: p.id,
            name: p.name,
            price_cents: p.price_cents,
            description: p.description,
            track_stock: Boolean(p.track_stock),
            stock_qty: Number(p.stock_qty ?? 0),
            image_url:
              p.image_source === "enhanced"
                ? p.image_enhanced_url ?? p.image_original_url ?? p.image_url
                : p.image_original_url ?? p.image_url ?? p.image_enhanced_url,
          }))}
          lang={lang}
          initialCart={initialCart}
          editOrderCode={editOrderCode}
          initialBuyerName={initialBuyerName}
          initialBuyerPhone={initialBuyerPhone}
        />

        {(products?.length ?? 0) === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            {t(lang, "buyer.menu_soon")}
          </div>
        ) : null}
      </div>
    </main>
  );
}
