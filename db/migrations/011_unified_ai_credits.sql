-- Unified AI credits: one balance + configurable per-feature cost

alter table public.profiles
  add column if not exists ai_credits int not null default 0;

update public.profiles
set ai_credits = greatest(
  coalesce(ai_credits, 0),
  coalesce(copy_credits, 0) + coalesce(image_credits, 0) + coalesce(poster_credits, 0)
);

alter table public.plan_prices
  add column if not exists ai_total_credits int not null default 0;

update public.plan_prices
set ai_total_credits = case
  when plan_tier = 'pro_88' then 29
  when plan_tier = 'pro_128' then 71
  else ai_total_credits
end;

create table if not exists public.ai_credit_costs (
  ai_type text primary key check (ai_type in ('copy', 'product_image', 'poster')),
  cost int not null check (cost > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.ai_credit_costs (ai_type, cost)
values
  ('copy', 1),
  ('product_image', 1),
  ('poster', 1)
on conflict (ai_type) do nothing;

alter table public.ai_credit_costs enable row level security;

drop policy if exists "ai credit costs read" on public.ai_credit_costs;
create policy "ai credit costs read"
on public.ai_credit_costs for select
using (public.is_admin() or auth.uid() is not null);

drop policy if exists "ai credit costs admin write" on public.ai_credit_costs;
create policy "ai credit costs admin write"
on public.ai_credit_costs for all
using (public.is_admin())
with check (public.is_admin());
