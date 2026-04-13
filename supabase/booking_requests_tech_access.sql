-- Allow TECH to read booking requests within their org and provide a secure RPC fallback.

create policy "org read booking_requests tech ops"
on public.booking_requests
for select
using (
  org_id = public.my_org_id()
  and (
    public.has_role('OWNER')
    or public.has_role('MANAGER')
    or public.has_role('RECEPTION')
    or public.has_role('TECH')
  )
);

create or replace function public.list_booking_requests_secure(p_status text default null)
returns table (
  id uuid,
  customer_name text,
  customer_phone text,
  requested_service text,
  preferred_staff text,
  note text,
  requested_start_at timestamptz,
  requested_end_at timestamptz,
  status text,
  appointment_id uuid,
  source text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    br.id,
    br.customer_name,
    br.customer_phone,
    br.requested_service,
    br.preferred_staff,
    br.note,
    br.requested_start_at,
    br.requested_end_at,
    br.status,
    br.appointment_id,
    br.source,
    br.created_at
  from public.booking_requests br
  where br.org_id = public.my_org_id()
    and (
      public.has_role('OWNER')
      or public.has_role('MANAGER')
      or public.has_role('RECEPTION')
      or public.has_role('TECH')
    )
    and (p_status is null or br.status = p_status)
  order by br.created_at asc
  limit 200;
$$;

grant execute on function public.list_booking_requests_secure(text) to authenticated;
