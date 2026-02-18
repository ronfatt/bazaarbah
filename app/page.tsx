import Link from "next/link";
import { Sparkles, Receipt, Store, WandSparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: Store,
    title: "10-minute setup",
    text: "Create your shop profile, products, and share link in one flow.",
  },
  {
    icon: Receipt,
    title: "Orders + receipts",
    text: "Track manual payment statuses and issue receipt PDFs.",
  },
  {
    icon: WandSparkles,
    title: "AI tools",
    text: "Generate copy, product visuals, and festive posters.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-14 px-6 py-10 md:px-10">
      <header className="flex items-center justify-between">
        <p className="font-mono text-sm font-medium text-neutral-700">Raya Seller SaaS</p>
        <div className="flex gap-3">
          <Link href="/auth">
            <Button variant="outline">Seller Login</Button>
          </Link>
          <Link href="/dashboard">
            <Button>Dashboard</Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-8 rounded-3xl border border-neutral-200 bg-white/90 p-8 shadow-sm md:grid-cols-2 md:p-12">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-semibold text-amber-700">
            <Sparkles size={14} /> Seasonal SaaS
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl">Raya Kuih Seller Platform</h1>
          <p className="max-w-xl text-neutral-600">Seller dashboard + buyer storefront. No buyer registration, no webhook complexity.</p>
          <div className="flex gap-3">
            <Link href="/dashboard">
              <Button size="lg">Open Seller Dashboard</Button>
            </Link>
          </div>
        </div>

        <Card className="bg-neutral-950 text-neutral-100">
          <p className="font-mono text-xs text-neutral-400">Scope</p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-200">
            <li>Seller login + shop/product/order management</li>
            <li>Buyer storefront and order status page</li>
            <li>Manual QR proof submission + mark paid</li>
            <li>Receipt generation + AI credits tooling</li>
          </ul>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {pillars.map((item) => (
          <Card key={item.title}>
            <item.icon className="text-amber-600" size={22} />
            <h2 className="mt-4 text-lg font-semibold text-neutral-900">{item.title}</h2>
            <p className="mt-2 text-sm text-neutral-600">{item.text}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
