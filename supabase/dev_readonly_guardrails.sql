-- DEV is a preview-only role.
-- Goal: DEV can inspect all pages/data needed for feature review,
-- but must not mutate production-like operational data.

-- 1) Keep DEV in role constraints, but do not grant any write policies.
-- Existing write policies already whitelist OWNER/MANAGER/RECEPTION/TECH/ACCOUNTANT explicitly,
-- so DEV stays read-only by default under RLS.

-- 2) Make intent explicit for invite code visibility: OWNER-only read.
drop policy if exists "owner dev read invite codes" on public.invite_codes;
create policy "owner read invite codes" on public.invite_codes
for select using (
  org_id = public.my_org_id() and (
    public.has_role('OWNER')
    or auth.jwt() ->> 'role' = 'service_role'
  )
);

-- 3) Defensive RPC guard: reject DEV on operational mutate functions even if UI is bypassed.
create or replace function public.assert_not_dev_preview()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.has_role('DEV') then
    raise exception 'DEV_READ_ONLY';
  end if;
end;
$$;

grant execute on function public.assert_not_dev_preview() to authenticated;

-- NOTE:
-- Current mutate RLS policies do not include DEV, so direct table writes are already blocked.
-- This helper is meant to be called inside future secure mutate RPCs when those RPCs are revised,
-- to keep the preview-only contract explicit and durable.
