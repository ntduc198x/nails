-- Smoke tests for checkout integrity/idempotency
-- Run in Supabase SQL Editor after deploying schema + rls + RPC scripts.
-- NOTE: This script is read-only checks + optional helper queries (no destructive writes).

-- 1) Ensure only the new RPC signature exists (6 params)
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'checkout_close_ticket_secure'
order by args;

-- Expected: only one row with
-- text, text, jsonb, uuid, integer, text

-- 2) Check idempotency table exists
select to_regclass('public.checkout_requests') as checkout_requests_table;

-- Expected: public.checkout_requests

-- 3) Detect duplicate CLOSED tickets per appointment (must be 0 rows)
select appointment_id, count(*) as closed_count
from public.tickets
where appointment_id is not null
  and status = 'CLOSED'
group by appointment_id
having count(*) > 1;

-- 4) Detect duplicate idempotency keys in same org (must be 0 rows)
select org_id, idempotency_key, count(*) as dup_count
from public.checkout_requests
group by org_id, idempotency_key
having count(*) > 1;

-- 5) Quick recent checkout snapshot for manual verification
select
  t.id as ticket_id,
  t.created_at,
  t.status,
  t.appointment_id,
  (t.totals_json->>'grand_total')::numeric as grand_total,
  r.public_token,
  cr.idempotency_key
from public.tickets t
left join lateral (
  select public_token
  from public.receipts rr
  where rr.ticket_id = t.id
  order by rr.created_at desc
  limit 1
) r on true
left join public.checkout_requests cr on cr.ticket_id = t.id
where t.status = 'CLOSED'
order by t.created_at desc
limit 20;
