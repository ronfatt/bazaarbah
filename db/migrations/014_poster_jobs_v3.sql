-- Poster Generator v3 jobs

create table if not exists public.poster_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'running', 'done', 'failed')),
  locale text not null default 'en' check (locale in ('en', 'ms', 'zh')),
  festival text not null default 'generic' check (festival in ('generic', 'ramadan', 'raya', 'cny', 'deepavali', 'christmas', 'valentine', 'birthday', 'none')),
  objective text not null default 'preorder' check (objective in ('flash_sale', 'new_launch', 'preorder', 'limited', 'bundle', 'free_delivery', 'whatsapp')),
  style text not null default 'retail' check (style in ('premium', 'festive', 'minimal', 'retail', 'cute')),
  ratio text not null default '9:16' check (ratio in ('9:16', '1:1', '4:5')),
  headline text,
  subheadline text,
  bullets_json text,
  cta text,
  price_text text,
  footer text,
  background_url text,
  final_poster_url text,
  layout_json text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_poster_jobs_user_created on public.poster_jobs(user_id, created_at desc);
create index if not exists idx_poster_jobs_shop_created on public.poster_jobs(shop_id, created_at desc);

create or replace function public.set_poster_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_poster_jobs_updated_at on public.poster_jobs;
create trigger trg_set_poster_jobs_updated_at
before update on public.poster_jobs
for each row execute function public.set_poster_jobs_updated_at();

alter table public.poster_jobs enable row level security;

drop policy if exists "poster jobs owner or admin read" on public.poster_jobs;
create policy "poster jobs owner or admin read"
on public.poster_jobs for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "poster jobs owner create" on public.poster_jobs;
create policy "poster jobs owner create"
on public.poster_jobs for insert
with check (auth.uid() = user_id);

drop policy if exists "poster jobs owner or admin update" on public.poster_jobs;
create policy "poster jobs owner or admin update"
on public.poster_jobs for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());
