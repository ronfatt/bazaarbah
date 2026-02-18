alter table public.orders
add column if not exists paid_at timestamptz;
