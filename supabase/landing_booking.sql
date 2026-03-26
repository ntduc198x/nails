-- Public landing booking pipeline for Chạm Beauty
-- Run after supabase/deploy.sql

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  requested_service text,
  preferred_staff text,
  note text,
  requested_start_at timestamptz not null,
  requested_end_at timestamptz not null,
  source text not null default 'landing_page',
  status text not null default 'NEW' check (status in ('NEW','CONFIRMED','CANCELLED','CONVERTED')),
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_requests_org_created_at
  on public.booking_requests (org_id, created_at desc);

create index if not exists idx_booking_requests_org_status_start
  on public.booking_requests (org_id, status, requested_start_at);

alter table public.booking_requests enable row level security;

drop policy if exists "org read booking_requests" on public.booking_requests;
create policy "org read booking_requests" on public.booking_requests
for select using (
  org_id = public.my_org_id()
  and (
    public.has_role('OWNER')
    or public.has_role('MANAGER')
    or public.has_role('RECEPTION')
  )
);

drop policy if exists "org update booking_requests" on public.booking_requests;
create policy "org update booking_requests" on public.booking_requests
for update using (
  org_id = public.my_org_id()
  and (
    public.has_role('OWNER')
    or public.has_role('MANAGER')
    or public.has_role('RECEPTION')
  )
)
with check (
  org_id = public.my_org_id()
  and (
    public.has_role('OWNER')
    or public.has_role('MANAGER')
    or public.has_role('RECEPTION')
  )
);

create or replace function public.create_booking_request_public(
  p_customer_name text,
  p_customer_phone text,
  p_requested_service text default null,
  p_preferred_staff text default null,
  p_note text default null,
  p_requested_start_at timestamptz default null,
  p_requested_end_at timestamptz default null,
  p_source text default 'landing_page'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_branch_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_row public.booking_requests;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'CUSTOMER_NAME_REQUIRED';
  end if;

  if p_customer_phone is null or btrim(p_customer_phone) = '' then
    raise exception 'CUSTOMER_PHONE_REQUIRED';
  end if;

  if p_requested_start_at is null then
    raise exception 'REQUESTED_START_REQUIRED';
  end if;

  v_start := p_requested_start_at;
  v_end := coalesce(p_requested_end_at, p_requested_start_at + interval '60 minutes');

  if v_end <= v_start then
    raise exception 'INVALID_TIME_RANGE';
  end if;

  select id into v_org_id
  from public.orgs
  order by created_at asc
  limit 1;

  if v_org_id is null then
    raise exception 'ORG_NOT_READY';
  end if;

  select id into v_branch_id
  from public.branches
  where org_id = v_org_id
  order by created_at asc
  limit 1;

  if v_branch_id is null then
    raise exception 'BRANCH_NOT_READY';
  end if;

  insert into public.booking_requests (
    org_id,
    branch_id,
    customer_name,
    customer_phone,
    requested_service,
    preferred_staff,
    note,
    requested_start_at,
    requested_end_at,
    source
  )
  values (
    v_org_id,
    v_branch_id,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    nullif(btrim(coalesce(p_requested_service, '')), ''),
    nullif(btrim(coalesce(p_preferred_staff, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    v_start,
    v_end,
    coalesce(nullif(btrim(coalesce(p_source, '')), ''), 'landing_page')
  )
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'requested_start_at', v_row.requested_start_at,
    'requested_end_at', v_row.requested_end_at
  );
end;
$$;

grant execute on function public.create_booking_request_public(
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text
) to anon, authenticated;


create or replace function public.convert_booking_request_to_appointment_secure(
  p_booking_request_id uuid,
  p_staff_user_id uuid default null,
  p_resource_id uuid default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_org_id uuid;
  v_branch_id uuid;
  v_allowed boolean;
  v_req public.booking_requests;
  v_customer_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_appointment_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select p.org_id, p.default_branch_id into v_org_id, v_branch_id
  from public.profiles p
  where p.user_id = v_uid
  limit 1;

  if v_org_id is null then
    raise exception 'ORG_CONTEXT_REQUIRED';
  end if;

  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_uid
      and ur.org_id = v_org_id
      and ur.role in ('OWNER','MANAGER','RECEPTION')
  ) into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_req
  from public.booking_requests br
  where br.id = p_booking_request_id
    and br.org_id = v_org_id
  limit 1;

  if v_req.id is null then
    raise exception 'BOOKING_REQUEST_NOT_FOUND';
  end if;

  if v_req.status in ('CANCELLED', 'CONVERTED') then
    raise exception 'BOOKING_REQUEST_ALREADY_FINALIZED';
  end if;

  v_start := coalesce(p_start_at, v_req.requested_start_at);
  v_end := coalesce(p_end_at, v_req.requested_end_at, v_start + interval '60 minutes');

  if v_end <= v_start then
    raise exception 'INVALID_TIME_RANGE';
  end if;

  select c.id into v_customer_id
  from public.customers c
  where c.org_id = v_org_id
    and c.name = v_req.customer_name
    and coalesce(c.phone, '') = coalesce(v_req.customer_phone, '')
  order by c.created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.customers (org_id, name, phone, notes)
    values (
      v_org_id,
      v_req.customer_name,
      v_req.customer_phone,
      concat_ws(' | ',
        case when v_req.requested_service is not null then 'DV: ' || v_req.requested_service else null end,
        case when v_req.preferred_staff is not null then 'Thợ mong muốn: ' || v_req.preferred_staff else null end,
        nullif(v_req.note, '')
      )
    )
    returning id into v_customer_id;
  else
    update public.customers
    set notes = concat_ws(' | ',
      nullif(notes, ''),
      case when v_req.requested_service is not null then 'DV: ' || v_req.requested_service else null end,
      case when v_req.preferred_staff is not null then 'Thợ mong muốn: ' || v_req.preferred_staff else null end,
      nullif(v_req.note, '')
    )
    where id = v_customer_id and org_id = v_org_id;
  end if;

  insert into public.appointments (
    org_id,
    branch_id,
    customer_id,
    staff_user_id,
    resource_id,
    start_at,
    end_at,
    status
  ) values (
    v_org_id,
    coalesce(v_req.branch_id, v_branch_id),
    v_customer_id,
    p_staff_user_id,
    p_resource_id,
    v_start,
    v_end,
    'BOOKED'
  )
  returning id into v_appointment_id;

  update public.booking_requests
  set status = 'CONVERTED',
      appointment_id = v_appointment_id
  where id = v_req.id;

  return jsonb_build_object(
    'booking_request_id', v_req.id,
    'appointment_id', v_appointment_id,
    'status', 'CONVERTED'
  );
end;
$$;

grant execute on function public.convert_booking_request_to_appointment_secure(
  uuid,
  uuid,
  uuid,
  timestamptz,
  timestamptz
) to authenticated;
