"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { currencyFromCents } from "@/lib/utils";
import { t, type Lang } from "@/lib/i18n";

type StallOrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  line_total_cents: number;
};

type StallQuickPayProps = {
  lang: Lang;
  orderCode: string;
  status: "pending_payment" | "proof_submitted" | "paid" | "cancelled";
  subtotalCents: number;
  shopName: string;
  shopSlug: string;
  paymentQrUrl: string | null;
  items: StallOrderItem[];
  paidAt: string | null;
};

function statusText(status: StallQuickPayProps["status"]) {
  if (status === "paid") return "Bayaran disahkan";
  if (status === "cancelled") return "Dibatalkan";
  return "Menunggu bayaran";
}

export function StallQuickPay({
  lang,
  orderCode,
  status: initialStatus,
  subtotalCents,
  shopName,
  shopSlug,
  paymentQrUrl,
  items,
  paidAt: initialPaidAt,
}: StallQuickPayProps) {
  const [status, setStatus] = useState<StallQuickPayProps["status"]>(
    initialStatus === "proof_submitted" ? "pending_payment" : initialStatus,
  );
  const [paidAt, setPaidAt] = useState<string | null>(initialPaidAt);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canMarkPaid = status === "pending_payment";

  const editCartLink = useMemo(() => {
    const cart = items.map((item) => `${item.product_id}:${item.qty}`).join(",");
    const params = new URLSearchParams();
    params.set("editOrder", orderCode);
    if (cart) params.set("cart", cart);
    return `/s/${shopSlug}?${params.toString()}`;
  }, [items, orderCode, shopSlug]);

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(`${label} copied`);
      window.setTimeout(() => setCopyState(null), 1800);
    } catch {
      setCopyState("Copy failed");
      window.setTimeout(() => setCopyState(null), 1800);
    }
  }

  async function confirmPaid() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderCode}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update payment");
        return;
      }
      setStatus("paid");
      setPaidAt(json.paidAt ?? new Date().toISOString());
      setConfirmOpen(false);
    } catch {
      setError("Failed to update payment");
    } finally {
      setSubmitting(false);
    }
  }

  const paidAtLabel = paidAt
    ? new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang === "ms" ? "ms-MY" : "en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(paidAt))
    : "-";

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-8">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
          <section className="rounded-3xl border border-white/12 bg-white/8 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Bayar Sekarang</p>
            <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">{shopName}</h1>
            <p className="mt-1 text-sm text-white/65">Scan QR, bayar jumlah tepat, tunjuk resit kepada penjual.</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-white/80">{statusText(status)}</span>
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-white/80">Order {orderCode}</span>
            </div>

            <div className="mt-5 rounded-2xl border border-white/12 bg-[#0a1f1a]/80 p-4">
              <p className="text-xs uppercase tracking-widest text-white/50">Jumlah Bayaran</p>
              <p className="mt-1 text-4xl font-black text-[#F3F4F6] md:text-5xl">{currencyFromCents(subtotalCents)}</p>
              <p className="mt-2 text-xs text-white/55">Please pay the exact amount.</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full border-white/20 bg-white/5 px-4 text-xs"
                  onClick={() => copyValue((subtotalCents / 100).toFixed(2), "Amount")}
                >
                  Copy Amount
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full border-white/20 bg-white/5 px-4 text-xs"
                  onClick={() => copyValue(orderCode, "Order code")}
                >
                  Copy Order Code
                </Button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/12 bg-white p-4 text-neutral-900">
              <div className="aspect-square w-full max-w-[280px] rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                {paymentQrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={paymentQrUrl} alt="Payment QR" className="h-full w-full rounded-lg object-contain" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-neutral-500">QR not uploaded by seller yet</div>
                )}
              </div>

              <ol className="mt-4 space-y-2 text-sm text-neutral-700">
                <li>1. Scan QR &amp; pay {currencyFromCents(subtotalCents)}</li>
                <li>2. Show payment record to seller, then tap “Mark as Paid”</li>
              </ol>
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-white/12 bg-white/8 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:sticky lg:top-6 md:p-6">
            <h2 className="text-xl font-bold text-white">{t(lang, "buyer.items")}</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-sm text-white/90">
                  <p>
                    {item.product_name} x {item.qty}
                  </p>
                  <p className="font-semibold">{currencyFromCents(item.line_total_cents)}</p>
                </div>
              ))}
              {items.length === 0 ? <p className="text-sm text-white/60">{t(lang, "buyer.no_items")}</p> : null}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-lg font-bold text-white">Jumlah: {currencyFromCents(subtotalCents)}</p>
              <Link
                href={editCartLink}
                className="mt-3 inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Back to items selected
              </Link>
            </div>

            {status === "paid" ? (
              <div className="mt-5 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-4">
                <p className="text-lg font-semibold text-emerald-200">Payment confirmed</p>
                <p className="mt-1 text-sm text-emerald-100/90">Order: {orderCode}</p>
                <p className="text-sm text-emerald-100/90">Total: {currencyFromCents(subtotalCents)}</p>
                <p className="text-sm text-emerald-100/90">Time: {paidAtLabel}</p>
                <Link href={`/s/${shopSlug}`} className="mt-3 inline-flex rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-[#0B1F1A]">
                  Back to shop
                </Link>
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
            {copyState ? <p className="mt-3 text-xs text-white/70">{copyState}</p> : null}
          </aside>
        </div>
      </div>

      {canMarkPaid ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/15 bg-[#0a201a]/95 px-4 py-3 backdrop-blur-xl md:px-6">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <p className="hidden text-sm text-white/70 md:block">Seller has checked buyer&apos;s payment record.</p>
            <Button type="button" className="h-12 w-full text-base md:w-auto" onClick={() => setConfirmOpen(true)}>
              Mark as Paid
            </Button>
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0f2a23] p-5 text-white">
            <h3 className="text-lg font-semibold">Confirm payment received?</h3>
            <p className="mt-2 text-sm text-white/70">Seller has checked buyer&apos;s payment record.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmPaid} disabled={submitting}>
                {submitting ? "Confirming..." : "Confirm Paid"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
