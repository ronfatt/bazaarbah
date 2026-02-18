# Raya Kuih Seller Platform (MVP)

Seasonal SaaS for Raya sellers with seller dashboard + public buyer flow.

## Stack
- Next.js App Router + Tailwind
- Supabase (Auth + Postgres + Storage-ready)
- Next.js route handlers for APIs
- `pdf-lib` for receipts
- `canvas` for poster composition
- OpenAI API for copy + image generation

## Routes
- Seller (login required)
  - `/dashboard`
  - `/dashboard/shop`
  - `/dashboard/products`
  - `/dashboard/orders`
  - `/dashboard/orders/[id]`
  - `/dashboard/ai`
  - `/dashboard/billing`
- Buyer (no login)
  - `/s/[slug]`
  - `/o/[order_code]`

## APIs
- `GET/POST/PATCH /api/shops`
- `POST /api/products`
- `PATCH/DELETE /api/products/:id`
- `POST /api/orders` (buyer creates order)
- `POST /api/orders/by-code/:orderCode/proof` (buyer submits proof)
- `POST /api/orders/:id/mark-paid` (seller confirms)
- `POST /api/orders/:id/receipt` (create receipt record)
- `GET /api/orders/:id/receipt` (download PDF)
- `POST /api/ai/copy`
- `POST /api/ai/poster`
- `POST /api/ai/poster-compose`

## Database Migration
Run in Supabase SQL editor:
- `/Users/rms/Desktop/bazaarBah/db/migrations/001_init.sql`
- `/Users/rms/Desktop/bazaarBah/db/migrations/002_raya_core.sql`

`002_raya_core.sql` contains your requested schema:
`profiles, shops, products, orders, order_items, payments, receipts, ai_jobs` with RLS.

## Env
Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

## Run
```bash
npm install
npm run dev
```
