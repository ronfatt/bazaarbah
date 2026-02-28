alter table public.profiles
  add column if not exists referral_path text,
  add column if not exists is_affiliate_enabled boolean not null default false,
  add column if not exists affiliate_enabled_at timestamptz;

update public.plan_prices
set list_price_cents = 16800
where plan_tier = 'pro_128';

alter table public.credit_topup_configs
  drop constraint if exists credit_topup_configs_target_plan_check;

update public.credit_topup_configs
set
  target_plan = 'credit_50',
  label = 'AI Credit Top-up',
  credits = 50,
  price_cents = 5000,
  is_active = true
where target_plan = 'credit_100';

insert into public.credit_topup_configs(target_plan, label, credits, price_cents, is_active)
values ('credit_50', 'AI Credit Top-up', 50, 5000, true)
on conflict (target_plan) do update
set
  label = excluded.label,
  credits = excluded.credits,
  price_cents = excluded.price_cents,
  is_active = excluded.is_active;

alter table public.credit_topup_configs
  add constraint credit_topup_configs_target_plan_check
  check (target_plan in ('credit_50'));

alter table public.plan_requests
  drop constraint if exists plan_requests_target_plan_check;

alter table public.plan_requests
  add constraint plan_requests_target_plan_check
  check (target_plan in ('pro_88', 'pro_128', 'credit_50'));

create table if not exists public.affiliate_events (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  event_type text not null check (event_type in ('PACKAGE_PURCHASE', 'CREDIT_TOPUP')),
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'MYR' check (currency = 'MYR'),
  package_code text check (package_code in ('P88', 'P168')),
  topup_code text check (topup_code in ('T50')),
  external_ref text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.affiliate_events(id) on delete cascade,
  earner_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  level int not null check (level between 1 and 3),
  rate_bps int not null check (rate_bps >= 0),
  amount_cents int not null check (amount_cents >= 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'PAID', 'REVERSED')),
  note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED')),
  bank_info_json text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz
);

create index if not exists idx_affiliate_events_buyer_created on public.affiliate_events(buyer_id, created_at desc);
create index if not exists idx_commission_ledger_earner_status_created on public.commission_ledger(earner_id, status, created_at desc);
create index if not exists idx_commission_ledger_event on public.commission_ledger(event_id);
create index if not exists idx_payout_requests_user_status_created on public.payout_requests(user_id, status, created_at desc);

alter table public.affiliate_events enable row level security;
alter table public.commission_ledger enable row level security;
alter table public.payout_requests enable row level security;

drop policy if exists "affiliate events admin read" on public.affiliate_events;
drop policy if exists "affiliate events own read" on public.affiliate_events;
drop policy if exists "affiliate events admin write" on public.affiliate_events;
drop policy if exists "commission ledger admin read" on public.commission_ledger;
drop policy if exists "commission ledger own read" on public.commission_ledger;
drop policy if exists "commission ledger admin write" on public.commission_ledger;
drop policy if exists "payout requests own read" on public.payout_requests;
drop policy if exists "payout requests own create" on public.payout_requests;
drop policy if exists "payout requests admin read" on public.payout_requests;
drop policy if exists "payout requests admin write" on public.payout_requests;

create policy "affiliate events admin read"
on public.affiliate_events for select
using (public.is_admin());

create policy "affiliate events own read"
on public.affiliate_events for select
using (auth.uid() = buyer_id);

create policy "affiliate events admin write"
on public.affiliate_events for all
using (public.is_admin())
with check (public.is_admin());

create policy "commission ledger admin read"
on public.commission_ledger for select
using (public.is_admin());

create policy "commission ledger own read"
on public.commission_ledger for select
using (auth.uid() = earner_id);

create policy "commission ledger admin write"
on public.commission_ledger for all
using (public.is_admin())
with check (public.is_admin());

create policy "payout requests own read"
on public.payout_requests for select
using (auth.uid() = user_id);

create policy "payout requests own create"
on public.payout_requests for insert
with check (auth.uid() = user_id);

create policy "payout requests admin read"
on public.payout_requests for select
using (public.is_admin());

create policy "payout requests admin write"
on public.payout_requests for all
using (public.is_admin())
with check (public.is_admin());

update public.profiles
set
  is_affiliate_enabled = case
    when role = 'admin' or plan_tier in ('pro_88', 'pro_128') then true
    else false
  end,
  affiliate_enabled_at = case
    when role = 'admin' or plan_tier in ('pro_88', 'pro_128') then coalesce(affiliate_enabled_at, created_at, now())
    else null
  end,
  referral_code = case
    when role = 'admin' or plan_tier in ('pro_88', 'pro_128') then coalesce(referral_code, upper(substr(md5(id::text), 1, 8)))
    else null
  end;

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
      'referral_reward_issued',
      'affiliate_enabled',
      'commission_approved',
      'commission_paid',
      'commission_reversed',
      'payout_request_approved',
      'payout_request_paid',
      'payout_request_rejected'
    )
  );
