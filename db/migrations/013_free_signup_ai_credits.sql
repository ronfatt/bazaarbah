-- Free signup bonus: new members start with 10 unified AI credits.
alter table public.profiles
  alter column ai_credits set default 10;
