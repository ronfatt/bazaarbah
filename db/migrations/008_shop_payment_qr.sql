alter table public.shops
add column if not exists payment_qr_url text;

create or replace function public.get_order_public(p_order_code text)
returns table (
  id uuid,
  order_code text,
  status text,
  subtotal_cents int,
  created_at timestamptz,
  shop_name text,
  payment_qr_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.order_code, o.status, o.subtotal_cents, o.created_at, s.shop_name, s.payment_qr_url
  from public.orders o
  join public.shops s on s.id = o.shop_id
  where o.order_code = p_order_code
  limit 1;
$$;

revoke all on function public.get_order_public(text) from public;
grant execute on function public.get_order_public(text) to anon, authenticated;
