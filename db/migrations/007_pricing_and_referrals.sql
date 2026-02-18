-- Dynamic plan pricing + referral rewards

create table if not exists public.plan_prices (
  plan_tier text primary key check (plan_tier in ('pro_88', 'pro_128')),
  list_price_cents int not null check (list_price_cents > 0),
  promo_price_cents int check (promo_price_cents > 0),
  promo_active boolean not null default false,
  promo_start_at timestamptz,
  promo_end_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.plan_prices(plan_tier, list_price_cents)
values
  ('pro_88', 8800),
  ('pro_128', 12800)
on conflict (plan_tier) do nothing;

alter table public.plan_prices enable row level security;

drop policy if exists "plan prices public read" on public.plan_prices;
drop policy if exists "plan prices admin write" on public.plan_prices;

create policy "plan prices public read"
on public.plan_prices for select
using (true);

create policy "plan prices admin write"
on public.plan_prices for all
using (public.is_admin())
with check (public.is_admin());

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists referral_rewarded_at timestamptz,
  add column if not exists referral_bonus_total int not null default 0;

do $$
begin
  update public.profiles
  set referral_code = upper(substr(md5(id::text), 1, 10))
  where referral_code is null;
exception when others then
  null;
end $$;

create unique index if not exists idx_profiles_referral_code on public.profiles(referral_code) where referral_code is not null;
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  plan_tier text not null check (plan_tier in ('pro_88', 'pro_128')),
  copy_bonus int not null default 0,
  image_bonus int not null default 0,
  poster_bonus int not null default 0,
  created_at timestamptz not null default now(),
  unique (referred_user_id)
);

create index if not exists idx_referral_rewards_referrer on public.referral_rewards(referrer_id);
create index if not exists idx_referral_rewards_created_at on public.referral_rewards(created_at desc);

alter table public.referral_rewards enable row level security;

drop policy if exists "referral rewards admin read" on public.referral_rewards;
drop policy if exists "referral rewards own read" on public.referral_rewards;
drop policy if exists "referral rewards admin write" on public.referral_rewards;

create policy "referral rewards admin read"
on public.referral_rewards for select
using (public.is_admin());

create policy "referral rewards own read"
on public.referral_rewards for select
using (auth.uid() = referrer_id);

create policy "referral rewards admin write"
on public.referral_rewards for all
using (public.is_admin())
with check (public.is_admin());

alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_action_check;
alter table public.admin_audit_logs
  add constraint admin_audit_logs_action_check
  check (
    action in (
      'plan_request_approved',
      'plan_request_rejected',
      'member_plan_changed',
      'member_banned',
      'member_unbanned',
      'member_warned',
      'announcement_created',
      'plan_price_updated',
      'referral_reward_issued'
    )
  );

