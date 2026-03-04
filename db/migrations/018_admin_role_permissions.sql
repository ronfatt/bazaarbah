alter table public.profiles
  add column if not exists admin_role text
  check (admin_role is null or admin_role in ('super_admin', 'finance', 'marketing'));

update public.profiles
set admin_role = 'super_admin'
where role = 'admin' and admin_role is null;
