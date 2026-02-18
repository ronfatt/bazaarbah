-- Member operations + announcements

alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

create table if not exists public.member_notices (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('all', 'user')),
  type text not null check (type in ('announcement', 'warning')),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_member_notices_created_at on public.member_notices(created_at desc);
create index if not exists idx_member_notices_user on public.member_notices(user_id);
create index if not exists idx_member_notices_scope_active on public.member_notices(scope, is_active);

alter table public.member_notices enable row level security;

drop policy if exists "member notices admin read" on public.member_notices;
drop policy if exists "member notices admin write" on public.member_notices;
drop policy if exists "member notices seller read own" on public.member_notices;

create policy "member notices admin read"
on public.member_notices for select
using (public.is_admin());

create policy "member notices admin write"
on public.member_notices for all
using (public.is_admin())
with check (public.is_admin());

create policy "member notices seller read own"
on public.member_notices for select
using (
  is_active = true
  and (
    scope = 'all'
    or (scope = 'user' and user_id = auth.uid())
  )
);

-- Expand audit action domain for member operations
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
      'announcement_created'
    )
  );

