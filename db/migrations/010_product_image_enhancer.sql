alter table public.products
add column if not exists image_original_url text;

alter table public.products
add column if not exists image_enhanced_url text;

alter table public.products
add column if not exists image_source text not null default 'original'
check (image_source in ('original', 'enhanced'));

alter table public.products
add column if not exists enhanced_at timestamptz;

alter table public.products
add column if not exists enhanced_meta jsonb;

update public.products
set image_original_url = coalesce(image_original_url, image_url)
where image_url is not null;

update public.products
set image_source = 'original'
where image_source is null or image_source not in ('original', 'enhanced');
