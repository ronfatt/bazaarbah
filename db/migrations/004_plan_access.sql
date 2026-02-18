-- Plan access model:
-- free: dashboard only
-- pro_88: full access, copy 20 / image 6 / poster 3
-- pro_128: full access, copy 50 / image 15 / poster 6

alter table public.profiles
  add column if not exists plan_tier text not null default 'free' check (plan_tier in ('free', 'pro_88', 'pro_128'));

-- Backfill existing users safely.
update public.profiles
set
  plan_tier = case when plan = 'pro' then 'pro_88' else 'free' end,
  copy_credits = case when plan = 'pro' then greatest(copy_credits, 20) else 0 end,
  image_credits = case when plan = 'pro' then greatest(image_credits, 6) else 0 end,
  poster_credits = case when plan = 'pro' then greatest(poster_credits, 3) else 0 end
where plan_tier is null
  or plan_tier not in ('free', 'pro_88', 'pro_128')
  or (plan = 'pro' and plan_tier = 'free');

create table if not exists public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_plan text not null check (target_plan in ('pro_88', 'pro_128')),
  amount_cents int not null check (amount_cents > 0),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  proof_image_url text,
  reference_text text,
  note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_plan_requests_user on public.plan_requests(user_id);
create index if not exists idx_plan_requests_status on public.plan_requests(status);
create unique index if not exists idx_plan_requests_one_pending_per_user
on public.plan_requests(user_id)
where status = 'pending_review';

alter table public.plan_requests enable row level security;

drop policy if exists "plan requests owner read" on public.plan_requests;
drop policy if exists "plan requests owner create" on public.plan_requests;
drop policy if exists "plan requests admin update" on public.plan_requests;

create policy "plan requests owner or admin read"
on public.plan_requests for select
using (auth.uid() = user_id or public.is_admin());

create policy "plan requests owner create"
on public.plan_requests for insert
with check (auth.uid() = user_id);

create policy "plan requests admin update"
on public.plan_requests for update
using (public.is_admin())
with check (public.is_admin());
