create extension if not exists "pgcrypto";

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  slug text unique not null,
  brand_color text not null default '#f7b801',
  hero_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  buyer_name text not null,
  buyer_phone text not null,
  qty int not null check (qty > 0),
  total_cents int not null check (total_cents >= 0),
  receipt_url text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'fulfilled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_stores_owner_id on public.stores(owner_id);
create index if not exists idx_products_store_id on public.products(store_id);
create index if not exists idx_orders_store_id on public.orders(store_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

create policy "store owner read own stores"
on public.stores for select
using (auth.uid() = owner_id);

create policy "store owner manage own stores"
on public.stores for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "owner read own products"
on public.products for select
using (
  exists (
    select 1 from public.stores s
    where s.id = products.store_id and s.owner_id = auth.uid()
  )
);

create policy "owner manage own products"
on public.products for all
using (
  exists (
    select 1 from public.stores s
    where s.id = products.store_id and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = products.store_id and s.owner_id = auth.uid()
  )
);

create policy "owner read own orders"
on public.orders for select
using (
  exists (
    select 1 from public.stores s
    where s.id = orders.store_id and s.owner_id = auth.uid()
  )
);

create policy "public create orders"
on public.orders for insert
with check (true);
