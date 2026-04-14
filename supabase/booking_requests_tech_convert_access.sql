-- Allow TECH to convert booking requests into appointments via secure RPC.

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
      and ur.role in ('OWNER','MANAGER','RECEPTION','TECH')
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
    org_id, branch_id, customer_id, staff_user_id, resource_id, start_at, end_at, status
  ) values (
    v_org_id, coalesce(v_req.branch_id, v_branch_id), v_customer_id, p_staff_user_id, p_resource_id, v_start, v_end, 'BOOKED'
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
  uuid, uuid, uuid, timestamptz, timestamptz
) to authenticated;
