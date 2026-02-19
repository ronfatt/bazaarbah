-- Configurable credit top-up package for billing/admin pricing

create table if not exists public.credit_topup_configs (
  target_plan text primary key check (target_plan in ('credit_100')),
  label text not null default 'Credit Top-up',
  credits int not null check (credits > 0),
  price_cents int not null check (price_cents > 0),
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.credit_topup_configs(target_plan, label, credits, price_cents, is_active)
values ('credit_100', 'Credit Top-up', 100, 9800, true)
on conflict (target_plan) do nothing;

alter table public.credit_topup_configs enable row level security;

drop policy if exists "credit topup public read" on public.credit_topup_configs;
drop policy if exists "credit topup admin write" on public.credit_topup_configs;

create policy "credit topup public read"
on public.credit_topup_configs for select
using (true);

create policy "credit topup admin write"
on public.credit_topup_configs for all
using (public.is_admin())
with check (public.is_admin());

