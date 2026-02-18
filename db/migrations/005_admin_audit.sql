-- Admin audit trail for plan request reviews

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('plan_request_approved', 'plan_request_rejected')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  target_user_id uuid not null references public.profiles(id) on delete restrict,
  plan_request_id uuid references public.plan_requests(id) on delete set null,
  target_plan text check (target_plan in ('pro_88', 'pro_128')),
  from_status text,
  to_status text,
  note text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_logs_action on public.admin_audit_logs(action);
create index if not exists idx_admin_audit_logs_target_user on public.admin_audit_logs(target_user_id);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "admin audit logs admin read" on public.admin_audit_logs;
drop policy if exists "admin audit logs admin create" on public.admin_audit_logs;

create policy "admin audit logs admin read"
on public.admin_audit_logs for select
using (public.is_admin());

create policy "admin audit logs admin create"
on public.admin_audit_logs for insert
with check (public.is_admin());

