-- Backfill free signup bonus for members that never used AI.
-- This avoids re-granting credits to members who already consumed credits.
update public.profiles p
set ai_credits = 10
where p.plan_tier = 'free'
  and coalesce(p.ai_credits, 0) = 0
  and not exists (
    select 1
    from public.ai_jobs j
    where j.owner_id = p.id
  );
