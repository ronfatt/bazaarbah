-- Allow credit top-up requests in the same manual review flow.

alter table public.plan_requests
  drop constraint if exists plan_requests_target_plan_check;

alter table public.plan_requests
  add constraint plan_requests_target_plan_check
  check (target_plan in ('pro_88', 'pro_128', 'credit_100'));
