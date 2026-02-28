# Raya Kuih Seller Platform

Seasonal SaaS for Raya sellers with seller dashboard, buyer storefront, manual payment proof, receipt PDF, and AI marketing bundle.

## Core Routes

### Seller (auth required)
- `/dashboard` (KPI + weekly sales chart)
- `/dashboard/shop`
- `/dashboard/products`
- `/dashboard/orders`
- `/dashboard/orders/[id]`
- `/dashboard/ai`
- `/dashboard/billing`

### Buyer (no login)
- `/s/[slug]`
- `/o/[order_code]`

## AI Marketing Bundle

- `POST /api/ai/product-image`
  - Product background generation (no text), consumes `image_credits`
- `POST /api/ai/poster`
  - AI background + system typography overlay (16:9 / 9:16), consumes `poster_credits`
- `POST /api/ai/copy`
  - Outputs FB captions, WhatsApp broadcasts, hooks, consumes `copy_credits`

### Anti-abuse
- 3-second cooldown per user per AI type
- Daily basic limits:
  - poster 5
  - image 10
  - copy 50

## APIs
- `GET/POST/PATCH /api/shops`
- `POST /api/products`
- `PATCH/DELETE /api/products/:id`
- `POST /api/orders`
- `GET /api/orders/by-code/:orderCode`
- `POST /api/orders/by-code/:orderCode/proof`
- `POST /api/orders/:id/mark-paid` (auto creates receipt if missing)
- `POST /api/orders/:id/receipt`
- `GET /api/orders/:id/receipt`

## Database Migrations
Run in Supabase SQL Editor in this order:
1. `/Users/rms/Desktop/bazaarBah/db/migrations/001_init.sql`
2. `/Users/rms/Desktop/bazaarBah/db/migrations/002_raya_core.sql`
3. `/Users/rms/Desktop/bazaarBah/db/migrations/003_rls_hardening.sql`

`003_rls_hardening.sql` adds:
- seller/admin RLS hardening
- buyer read/submit via controlled RPC by `order_code`

## Env
Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL` (contoh: `https://bazaarbah.my`) untuk pastikan auth redirect guna domain production yang betul

## Run
```bash
npm install
npm run dev
```
