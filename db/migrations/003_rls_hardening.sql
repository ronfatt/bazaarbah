-- PART 9 hardening: admin global access, seller own-data only,
-- buyer order access through controlled RPC by order_code.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.get_order_public(p_order_code text)
returns table (
  id uuid,
  order_code text,
  status text,
  subtotal_cents int,
  created_at timestamptz,
  shop_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.order_code, o.status, o.subtotal_cents, o.created_at, s.shop_name
  from public.orders o
  join public.shops s on s.id = o.shop_id
  where o.order_code = p_order_code
  limit 1;
$$;

create or replace function public.get_order_items_public(p_order_code text)
returns table (
  id uuid,
  qty int,
  line_total_cents int,
  product_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select oi.id, oi.qty, oi.line_total_cents, p.name as product_name
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where o.order_code = p_order_code;
$$;

create or replace function public.submit_payment_proof_public(
  p_order_code text,
  p_reference_text text,
  p_proof_image_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_payment_id uuid;
begin
  select o.id into v_order_id
  from public.orders o
  where o.order_code = p_order_code
  limit 1;

  if v_order_id is null then
    raise exception 'Order not found';
  end if;

  insert into public.payments(order_id, method, reference_text, proof_image_url)
  values (v_order_id, 'qr_manual', p_reference_text, p_proof_image_url)
  returning id into v_payment_id;

  update public.orders
  set status = 'proof_submitted'
  where id = v_order_id and status in ('pending_payment', 'proof_submitted');

  return v_payment_id;
end;
$$;

revoke all on function public.get_order_public(text) from public;
revoke all on function public.get_order_items_public(text) from public;
revoke all on function public.submit_payment_proof_public(text, text, text) from public;

grant execute on function public.get_order_public(text) to anon, authenticated;
grant execute on function public.get_order_items_public(text) to anon, authenticated;
grant execute on function public.submit_payment_proof_public(text, text, text) to anon, authenticated;

-- Replace policies with explicit seller/admin gates

do $$
begin
  execute 'drop policy if exists "shops owner read" on public.shops';
  execute 'drop policy if exists "shops owner write" on public.shops';
  execute 'drop policy if exists "products owner read" on public.products';
  execute 'drop policy if exists "products owner write" on public.products';
  execute 'drop policy if exists "orders owner read" on public.orders';
  execute 'drop policy if exists "orders owner update" on public.orders';
  execute 'drop policy if exists "orders public read by code" on public.orders';
  execute 'drop policy if exists "order items owner read" on public.order_items';
  execute 'drop policy if exists "order items public read" on public.order_items';
  execute 'drop policy if exists "payments owner read" on public.payments';
  execute 'drop policy if exists "payments owner update" on public.payments';
  execute 'drop policy if exists "payments public read" on public.payments';
  execute 'drop policy if exists "receipts owner read" on public.receipts';
  execute 'drop policy if exists "receipts owner create" on public.receipts';
  execute 'drop policy if exists "ai jobs owner read" on public.ai_jobs';
  execute 'drop policy if exists "ai jobs owner create" on public.ai_jobs';
exception when others then
  null;
end $$;

create policy "shops owner or admin read"
on public.shops for select
using (auth.uid() = owner_id or public.is_admin());

create policy "shops owner or admin write"
on public.shops for all
using (auth.uid() = owner_id or public.is_admin())
with check (auth.uid() = owner_id or public.is_admin());

create policy "products owner or admin read"
on public.products for select
using (
  public.is_admin()
  or exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid())
);

create policy "products owner or admin write"
on public.products for all
using (
  public.is_admin()
  or exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid())
);

create policy "orders owner or admin read"
on public.orders for select
using (
  public.is_admin()
  or exists (select 1 from public.shops s where s.id = orders.shop_id and s.owner_id = auth.uid())
);

create policy "orders owner or admin write"
on public.orders for all
using (
  public.is_admin()
  or exists (select 1 from public.shops s where s.id = orders.shop_id and s.owner_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.shops s where s.id = orders.shop_id and s.owner_id = auth.uid())
);

create policy "order items owner or admin read"
on public.order_items for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = order_items.order_id and s.owner_id = auth.uid()
  )
);

create policy "order items owner or admin write"
on public.order_items for all
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = order_items.order_id and s.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = order_items.order_id and s.owner_id = auth.uid()
  )
);

create policy "payments owner or admin read"
on public.payments for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = payments.order_id and s.owner_id = auth.uid()
  )
);

create policy "payments owner or admin write"
on public.payments for all
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = payments.order_id and s.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = payments.order_id and s.owner_id = auth.uid()
  )
);

create policy "receipts owner or admin read"
on public.receipts for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = receipts.order_id and s.owner_id = auth.uid()
  )
);

create policy "receipts owner or admin write"
on public.receipts for all
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = receipts.order_id and s.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = receipts.order_id and s.owner_id = auth.uid()
  )
);

create policy "ai jobs owner or admin read"
on public.ai_jobs for select
using (auth.uid() = owner_id or public.is_admin());

create policy "ai jobs owner or admin write"
on public.ai_jobs for all
using (auth.uid() = owner_id or public.is_admin())
with check (auth.uid() = owner_id or public.is_admin());

-- public storefront remains available
-- (shops/products read-only policies from 002 are retained)
