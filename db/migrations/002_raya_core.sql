create extension if not exists "pgcrypto";

-- Reset MVP tables from the earlier draft schema

drop table if exists public.ai_jobs cascade;
drop table if exists public.receipts cascade;
drop table if exists public.payments cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.products cascade;
drop table if exists public.shops cascade;
drop table if exists public.profiles cascade;
drop table if exists public.stores cascade;

drop function if exists public.handle_new_user() cascade;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'seller' check (role in ('seller', 'admin')),
  plan text not null default 'basic' check (plan in ('basic', 'pro')),
  poster_credits int not null default 2,
  image_credits int not null default 10,
  copy_credits int not null default 30,
  created_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  shop_name text not null,
  phone_whatsapp text not null,
  address_text text,
  theme text not null default 'gold' check (theme in ('gold', 'minimal', 'cute')),
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'MYR' check (currency = 'MYR'),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  shop_id uuid not null references public.shops(id) on delete cascade,
  buyer_name text,
  buyer_phone text,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'proof_submitted', 'paid', 'cancelled')),
  subtotal_cents int not null check (subtotal_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty int not null check (qty > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  line_total_cents int not null check (line_total_cents >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null default 'qr_manual' check (method in ('qr_manual')),
  proof_image_url text,
  reference_text text,
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  receipt_no text not null unique,
  pdf_url text not null,
  issued_at timestamptz not null default now()
);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  type text not null check (type in ('product_image', 'poster', 'copy')),
  prompt text not null,
  result_url text,
  credits_used int not null default 1,
  created_at timestamptz not null default now()
);

create index idx_shops_owner_id on public.shops(owner_id);
create index idx_products_shop_id on public.products(shop_id);
create index idx_orders_shop_id on public.orders(shop_id);
create index idx_orders_code on public.orders(order_code);
create index idx_orders_created_at on public.orders(created_at desc);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_payments_order_id on public.payments(order_id);
create index idx_receipts_order_id on public.receipts(order_id);
create index idx_ai_jobs_owner_id on public.ai_jobs(owner_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.ai_jobs enable row level security;

create policy "profiles own select"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles own update"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "shops owner read"
on public.shops for select
using (auth.uid() = owner_id);

create policy "shops owner write"
on public.shops for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "shops public active read"
on public.shops for select
using (is_active = true);

create policy "products owner read"
on public.products for select
using (
  exists (
    select 1 from public.shops s
    where s.id = products.shop_id and s.owner_id = auth.uid()
  )
);

create policy "products owner write"
on public.products for all
using (
  exists (
    select 1 from public.shops s
    where s.id = products.shop_id and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = products.shop_id and s.owner_id = auth.uid()
  )
);

create policy "products public available read"
on public.products for select
using (
  is_available = true and
  exists (
    select 1 from public.shops s
    where s.id = products.shop_id and s.is_active = true
  )
);

create policy "orders owner read"
on public.orders for select
using (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_id = auth.uid()
  )
);

create policy "orders owner update"
on public.orders for update
using (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_id = auth.uid()
  )
);

create policy "orders public create"
on public.orders for insert
with check (true);

create policy "orders public read by code"
on public.orders for select
using (true);

create policy "order items owner read"
on public.order_items for select
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = order_items.order_id and s.owner_id = auth.uid()
  )
);

create policy "order items public create"
on public.order_items for insert
with check (true);

create policy "order items public read"
on public.order_items for select
using (true);

create policy "payments owner read"
on public.payments for select
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = payments.order_id and s.owner_id = auth.uid()
  )
);

create policy "payments owner update"
on public.payments for update
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = payments.order_id and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = payments.order_id and s.owner_id = auth.uid()
  )
);

create policy "payments public create"
on public.payments for insert
with check (true);

create policy "payments public read"
on public.payments for select
using (true);

create policy "receipts owner read"
on public.receipts for select
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = receipts.order_id and s.owner_id = auth.uid()
  )
);

create policy "receipts owner create"
on public.receipts for insert
with check (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = receipts.order_id and s.owner_id = auth.uid()
  )
);

create policy "ai jobs owner read"
on public.ai_jobs for select
using (auth.uid() = owner_id);

create policy "ai jobs owner create"
on public.ai_jobs for insert
with check (auth.uid() = owner_id);
