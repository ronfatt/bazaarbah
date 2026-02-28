alter table public.products
  add column if not exists track_stock boolean not null default false;

alter table public.products
  add column if not exists stock_qty int not null default 0 check (stock_qty >= 0);

alter table public.products
  add column if not exists sold_out boolean not null default false;

update public.products
set sold_out = case
  when track_stock = true and coalesce(stock_qty, 0) <= 0 then true
  else coalesce(sold_out, false)
end;
