-- CRM retention MVP patch
-- Apply after deploy.sql

alter table public.customers
  add column if not exists full_name text,
  add column if not exists birthday date,
  add column if not exists gender text,
  add column if not exists first_visit_at timestamptz,
  add column if not exists last_visit_at timestamptz,
  add column if not exists total_visits int not null default 0,
  add column if not exists total_spend numeric(12,2) not null default 0,
  add column if not exists last_service_summary text,
  add column if not exists favorite_staff_user_id uuid references public.profiles(user_id),
  add column if not exists customer_status text not null default 'NEW',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists care_note text,
  add column if not exists source text,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists follow_up_status text not null default 'PENDING',
  add column if not exists needs_merge_review boolean not null default false,
  add column if not exists merged_into_customer_id uuid references public.customers(id);

update public.customers
set
  full_name = coalesce(nullif(trim(full_name), ''), name),
  care_note = coalesce(care_note, notes)
where
  full_name is distinct from coalesce(nullif(trim(full_name), ''), name)
  or care_note is null;

create index if not exists idx_customers_org_phone on public.customers (org_id, phone);
create index if not exists idx_customers_org_status on public.customers (org_id, customer_status, last_visit_at desc);
create index if not exists idx_customers_org_follow_up on public.customers (org_id, next_follow_up_at) where next_follow_up_at is not null;

create table if not exists public.customer_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('BOOKING_REQUEST','APPOINTMENT','CHECKOUT','FOLLOW_UP_NOTE','TELEGRAM_CONTACT')),
  channel text,
  content_summary text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_activities_customer_created
  on public.customer_activities (customer_id, created_at desc);

alter table public.customer_activities enable row level security;

drop policy if exists "crm read customer activities" on public.customer_activities;
create policy "crm read customer activities" on public.customer_activities
for select using (
  org_id = public.my_org_id()
  and (
    public.has_role('OWNER')
    or public.has_role('MANAGER')
    or public.has_role('RECEPTION')
    or public.has_role('TECH')
  )
);

drop policy if exists "crm write customer activities" on public.customer_activities;
create policy "crm write customer activities" on public.customer_activities
for all using (
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

create or replace function public.normalize_customer_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  v_digits text;
begin
  if p_phone is null then
    return null;
  end if;

  v_digits := regexp_replace(p_phone, '\D', '', 'g');

  if v_digits = '' then
    return null;
  end if;

  if left(v_digits, 2) = '84' and length(v_digits) >= 11 then
    return '0' || substr(v_digits, 3);
  end if;

  return v_digits;
end;
$$;

create or replace function public.can_access_crm()
returns boolean
language sql
stable
as $$
  select
    public.has_role('OWNER')
    or public.has_role('MANAGER')
    or public.has_role('RECEPTION')
$$;

create or replace function public.infer_follow_up_days(p_service_summary text)
returns int
language plpgsql
immutable
as $$
declare
  v_text text := lower(coalesce(p_service_summary, ''));
begin
  if v_text like '%gel%' or v_text like '%biab%' then
    return 21;
  end if;

  if v_text like '%extension%' or v_text like '%refill%' or v_text like '%up mong%' or v_text like '%dual form%' then
    return 18;
  end if;

  return 30;
end;
$$;

create or replace function public.append_customer_activity(
  p_org_id uuid,
  p_customer_id uuid,
  p_type text,
  p_channel text,
  p_content_summary text,
  p_created_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_customer_id is null or p_org_id is null or p_content_summary is null or btrim(p_content_summary) = '' then
    return;
  end if;

  insert into public.customer_activities (
    org_id,
    customer_id,
    type,
    channel,
    content_summary,
    created_by
  )
  values (
    p_org_id,
    p_customer_id,
    p_type,
    p_channel,
    p_content_summary,
    p_created_by
  );
end;
$$;

create or replace function public.upsert_customer_by_identity(
  p_org_id uuid,
  p_full_name text,
  p_phone text default null,
  p_source text default null,
  p_care_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_phone text := public.normalize_customer_phone(p_phone);
begin
  if p_org_id is null then
    raise exception 'ORG_REQUIRED';
  end if;

  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'CUSTOMER_NAME_REQUIRED';
  end if;

  if v_phone is not null then
    select id
    into v_customer_id
    from public.customers
    where org_id = p_org_id
      and public.normalize_customer_phone(phone) = v_phone
      and merged_into_customer_id is null
    order by created_at asc
    limit 1;
  end if;

  if v_customer_id is null then
    select id
    into v_customer_id
    from public.customers
    where org_id = p_org_id
      and lower(trim(coalesce(full_name, name))) = lower(trim(p_full_name))
      and merged_into_customer_id is null
    order by created_at asc
    limit 1;
  end if;

  if v_customer_id is null then
    insert into public.customers (
      org_id,
      name,
      full_name,
      phone,
      notes,
      care_note,
      source
    )
    values (
      p_org_id,
      p_full_name,
      p_full_name,
      v_phone,
      p_care_note,
      p_care_note,
      p_source
    )
    returning id into v_customer_id;
  else
    update public.customers
    set
      full_name = coalesce(nullif(trim(full_name), ''), p_full_name),
      name = coalesce(name, p_full_name),
      phone = coalesce(phone, v_phone),
      source = coalesce(source, p_source),
      care_note = case
        when p_care_note is null or btrim(p_care_note) = '' then care_note
        when care_note is null or btrim(care_note) = '' then p_care_note
        when position(p_care_note in care_note) > 0 then care_note
        else care_note || E'\n' || p_care_note
      end
    where id = v_customer_id;
  end if;

  if v_phone is null then
    update public.customers
    set needs_merge_review = true
    where id = v_customer_id;
  end if;

  return v_customer_id;
end;
$$;

create or replace function public.refresh_customer_metrics(
  p_customer_id uuid default null,
  p_org_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer record;
  v_updated int := 0;
  v_first_visit timestamptz;
  v_last_visit timestamptz;
  v_total_visits int;
  v_total_spend numeric(12,2);
  v_last_service_summary text;
  v_favorite_staff_user_id uuid;
  v_status text;
  v_next_follow_up_at timestamptz;
begin
  for v_customer in
    select c.id, c.org_id
    from public.customers c
    where (p_customer_id is null or c.id = p_customer_id)
      and (p_org_id is null or c.org_id = p_org_id)
      and c.merged_into_customer_id is null
  loop
    select min(a.start_at), max(a.start_at)
    into v_first_visit, v_last_visit
    from public.appointments a
    where a.customer_id = v_customer.id
      and a.status in ('BOOKED','CHECKED_IN','DONE');

    select
      coalesce(count(*), 0),
      coalesce(sum((t.totals_json->>'grand_total')::numeric), 0)
    into v_total_visits, v_total_spend
    from public.tickets t
    where t.customer_id = v_customer.id
      and t.status = 'CLOSED';

    if v_total_visits = 0 then
      select count(*)
      into v_total_visits
      from public.appointments a
      where a.customer_id = v_customer.id
        and a.status in ('DONE','CHECKED_IN');
    end if;

    select string_agg(distinct s.name, ', ' order by s.name)
    into v_last_service_summary
    from public.tickets t
    join public.ticket_items ti on ti.ticket_id = t.id
    left join public.services s on s.id = ti.service_id
    where t.customer_id = v_customer.id
      and t.status = 'CLOSED'
      and t.created_at = (
        select max(t2.created_at)
        from public.tickets t2
        where t2.customer_id = v_customer.id
          and t2.status = 'CLOSED'
      );

    select a.staff_user_id
    into v_favorite_staff_user_id
    from public.tickets t
    join public.appointments a on a.id = t.appointment_id
    where t.customer_id = v_customer.id
      and t.status = 'CLOSED'
      and a.staff_user_id is not null
    group by a.staff_user_id
    order by count(*) desc, max(t.created_at) desc
    limit 1;

    if v_total_spend >= 3000000 or v_total_visits >= 8 then
      v_status := 'VIP';
    elsif v_last_visit is not null and v_last_visit < now() - interval '60 days' then
      v_status := 'LOST';
    elsif v_last_visit is not null and v_last_visit < now() - interval '30 days' then
      v_status := 'AT_RISK';
    elsif v_total_visits >= 3 then
      v_status := 'RETURNING';
    elsif v_total_visits >= 1 then
      v_status := 'ACTIVE';
    else
      v_status := 'NEW';
    end if;

    if v_last_visit is not null then
      v_next_follow_up_at := v_last_visit + make_interval(days => public.infer_follow_up_days(v_last_service_summary));
    else
      v_next_follow_up_at := null;
    end if;

    update public.customers
    set
      full_name = coalesce(nullif(trim(full_name), ''), name),
      first_visit_at = v_first_visit,
      last_visit_at = v_last_visit,
      total_visits = coalesce(v_total_visits, 0),
      total_spend = coalesce(v_total_spend, 0),
      last_service_summary = v_last_service_summary,
      favorite_staff_user_id = v_favorite_staff_user_id,
      customer_status = v_status,
      next_follow_up_at = case
        when follow_up_status = 'DONE' then next_follow_up_at
        else coalesce(next_follow_up_at, v_next_follow_up_at)
      end
    where id = v_customer.id;

    v_updated := v_updated + 1;
  end loop;

  return v_updated;
end;
$$;

create or replace function public.list_customers_crm(
  p_search text default null,
  p_status text default null,
  p_dormant_days int default null,
  p_vip_only boolean default false,
  p_source text default null
)
returns table (
  id uuid,
  org_id uuid,
  full_name text,
  phone text,
  birthday date,
  gender text,
  first_visit_at timestamptz,
  last_visit_at timestamptz,
  total_visits int,
  total_spend numeric,
  last_service_summary text,
  favorite_staff_user_id uuid,
  customer_status text,
  tags text[],
  care_note text,
  source text,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  follow_up_status text,
  needs_merge_review boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not public.can_access_crm() then
    raise exception 'FORBIDDEN';
  end if;

  select public.my_org_id() into v_org_id;
  if v_org_id is null then
    raise exception 'ORG_NOT_FOUND';
  end if;

  return query
  select
    c.id,
    c.org_id,
    coalesce(nullif(trim(c.full_name), ''), c.name) as full_name,
    c.phone,
    c.birthday,
    c.gender,
    c.first_visit_at,
    c.last_visit_at,
    c.total_visits,
    c.total_spend,
    c.last_service_summary,
    c.favorite_staff_user_id,
    c.customer_status,
    c.tags,
    coalesce(c.care_note, c.notes) as care_note,
    c.source,
    c.next_follow_up_at,
    c.last_contacted_at,
    c.follow_up_status,
    c.needs_merge_review
  from public.customers c
  where c.org_id = v_org_id
    and c.merged_into_customer_id is null
    and (
      p_search is null
      or lower(coalesce(c.full_name, c.name, '')) like '%' || lower(p_search) || '%'
      or coalesce(public.normalize_customer_phone(c.phone), '') like '%' || coalesce(public.normalize_customer_phone(p_search), p_search) || '%'
    )
    and (p_status is null or c.customer_status = p_status)
    and (p_source is null or c.source = p_source)
    and (not p_vip_only or c.customer_status = 'VIP')
    and (
      p_dormant_days is null
      or c.last_visit_at is null
      or c.last_visit_at <= now() - make_interval(days => p_dormant_days)
    )
  order by c.last_visit_at desc nulls last, c.total_spend desc, c.created_at desc;
end;
$$;

create or replace function public.get_customer_crm_detail(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_customer jsonb;
  v_appointments jsonb;
  v_tickets jsonb;
  v_booking_requests jsonb;
  v_activities jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not public.can_access_crm() and not public.has_role('TECH') then
    raise exception 'FORBIDDEN';
  end if;

  select public.my_org_id() into v_org_id;
  if v_org_id is null then
    raise exception 'ORG_NOT_FOUND';
  end if;

  select to_jsonb(x)
  into v_customer
  from (
    select
      c.id,
      c.org_id,
      coalesce(nullif(trim(c.full_name), ''), c.name) as full_name,
      c.phone,
      c.birthday,
      c.gender,
      c.first_visit_at,
      c.last_visit_at,
      c.total_visits,
      c.total_spend,
      c.last_service_summary,
      c.favorite_staff_user_id,
      c.customer_status,
      c.tags,
      coalesce(c.care_note, c.notes) as care_note,
      c.source,
      c.next_follow_up_at,
      c.last_contacted_at,
      c.follow_up_status,
      c.needs_merge_review
    from public.customers c
    where c.id = p_customer_id
      and c.org_id = v_org_id
      and c.merged_into_customer_id is null
  ) x;

  if v_customer is null then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.start_at desc), '[]'::jsonb)
  into v_appointments
  from (
    select id, start_at, end_at, status, staff_user_id, resource_id
    from public.appointments
    where customer_id = p_customer_id
      and org_id = v_org_id
    order by start_at desc
    limit 50
  ) a;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into v_tickets
  from (
    select
      t.id,
      t.status,
      t.created_at,
      t.appointment_id,
      t.totals_json,
      (
        select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
        from (
          select public_token, expires_at, created_at
          from public.receipts
          where ticket_id = t.id
          order by created_at desc
          limit 3
        ) r
      ) as receipts
    from public.tickets t
    where t.customer_id = p_customer_id
      and t.org_id = v_org_id
    order by t.created_at desc
    limit 50
  ) t;

  select coalesce(jsonb_agg(to_jsonb(b) order by b.created_at desc), '[]'::jsonb)
  into v_booking_requests
  from (
    select
      br.id,
      br.customer_name,
      br.customer_phone,
      br.requested_service,
      br.requested_start_at,
      br.requested_end_at,
      br.source,
      br.status,
      br.created_at
    from public.booking_requests br
    join public.customers c on c.id = p_customer_id
    where br.org_id = v_org_id
      and (
        public.normalize_customer_phone(br.customer_phone) = public.normalize_customer_phone(c.phone)
        or lower(trim(br.customer_name)) = lower(trim(coalesce(c.full_name, c.name)))
      )
    order by br.created_at desc
    limit 50
  ) b;

  select coalesce(jsonb_agg(to_jsonb(ca) order by ca.created_at desc), '[]'::jsonb)
  into v_activities
  from (
    select id, customer_id, type, channel, content_summary, created_by, created_at
    from public.customer_activities
    where customer_id = p_customer_id
    order by created_at desc
    limit 100
  ) ca;

  return jsonb_build_object(
    'customer', v_customer,
    'appointments', v_appointments,
    'tickets', v_tickets,
    'booking_requests', v_booking_requests,
    'activities', v_activities
  );
end;
$$;

create or replace function public.update_customer_care_note(
  p_customer_id uuid,
  p_care_note text,
  p_tags text[] default '{}'::text[],
  p_next_follow_up_at timestamptz default null,
  p_follow_up_status text default 'PENDING'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not public.can_access_crm() then
    raise exception 'FORBIDDEN';
  end if;

  select public.my_org_id() into v_org_id;

  update public.customers
  set
    care_note = p_care_note,
    tags = coalesce(p_tags, '{}'::text[]),
    next_follow_up_at = p_next_follow_up_at,
    follow_up_status = coalesce(p_follow_up_status, 'PENDING'),
    last_contacted_at = now()
  where id = p_customer_id
    and org_id = v_org_id;

  if not found then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  perform public.append_customer_activity(
    v_org_id,
    p_customer_id,
    'FOLLOW_UP_NOTE',
    'MANUAL',
    coalesce(nullif(trim(p_care_note), ''), 'Cập nhật ghi chú chăm sóc'),
    auth.uid()
  );

  return jsonb_build_object('ok', true, 'customer_id', p_customer_id);
end;
$$;

create or replace function public.list_follow_up_candidates(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  id uuid,
  org_id uuid,
  full_name text,
  phone text,
  birthday date,
  gender text,
  first_visit_at timestamptz,
  last_visit_at timestamptz,
  total_visits int,
  total_spend numeric,
  last_service_summary text,
  favorite_staff_user_id uuid,
  customer_status text,
  tags text[],
  care_note text,
  source text,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  follow_up_status text,
  needs_merge_review boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not public.can_access_crm() then
    raise exception 'FORBIDDEN';
  end if;

  select public.my_org_id() into v_org_id;

  return query
  select
    c.id,
    c.org_id,
    coalesce(nullif(trim(c.full_name), ''), c.name) as full_name,
    c.phone,
    c.birthday,
    c.gender,
    c.first_visit_at,
    c.last_visit_at,
    c.total_visits,
    c.total_spend,
    c.last_service_summary,
    c.favorite_staff_user_id,
    c.customer_status,
    c.tags,
    coalesce(c.care_note, c.notes) as care_note,
    c.source,
    c.next_follow_up_at,
    c.last_contacted_at,
    c.follow_up_status,
    c.needs_merge_review
  from public.customers c
  where c.org_id = v_org_id
    and c.next_follow_up_at is not null
    and (p_from is null or c.next_follow_up_at >= p_from)
    and (p_to is null or c.next_follow_up_at <= p_to)
    and coalesce(c.follow_up_status, 'PENDING') <> 'DONE'
  order by c.next_follow_up_at asc, c.total_spend desc;
end;
$$;

create or replace function public.crm_ticket_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is not null and new.status = 'CLOSED' then
    perform public.refresh_customer_metrics(new.customer_id, null);
    perform public.append_customer_activity(
      new.org_id,
      new.customer_id,
      'CHECKOUT',
      'APP',
      'Thanh toán thành công, tổng bill ' || coalesce(new.totals_json->>'grand_total', '0'),
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crm_ticket_after_insert on public.tickets;
create trigger trg_crm_ticket_after_insert
after insert on public.tickets
for each row
execute function public.crm_ticket_after_change();

create or replace function public.crm_appointment_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.append_customer_activity(
      new.org_id,
      new.customer_id,
      'APPOINTMENT',
      'APP',
      'Tạo lịch hẹn ' || to_char(new.start_at at time zone 'Asia/Bangkok', 'DD/MM HH24:MI'),
      auth.uid()
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.append_customer_activity(
      new.org_id,
      new.customer_id,
      'APPOINTMENT',
      'APP',
      'Cập nhật lịch hẹn sang trạng thái ' || new.status,
      auth.uid()
    );
  end if;

  perform public.refresh_customer_metrics(new.customer_id, null);
  return new;
end;
$$;

drop trigger if exists trg_crm_appointment_after_insert on public.appointments;
create trigger trg_crm_appointment_after_insert
after insert on public.appointments
for each row
execute function public.crm_appointment_after_change();

drop trigger if exists trg_crm_appointment_after_update on public.appointments;
create trigger trg_crm_appointment_after_update
after update of status on public.appointments
for each row
execute function public.crm_appointment_after_change();

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
  v_customer_id uuid;
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
    raise exception 'ORG_NOT_FOUND';
  end if;

  select id into v_branch_id
  from public.branches
  where org_id = v_org_id
  order by created_at asc
  limit 1;

  if v_branch_id is null then
    raise exception 'BRANCH_NOT_FOUND';
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
    source,
    status
  )
  values (
    v_org_id,
    v_branch_id,
    p_customer_name,
    public.normalize_customer_phone(p_customer_phone),
    p_requested_service,
    p_preferred_staff,
    p_note,
    v_start,
    v_end,
    coalesce(nullif(trim(p_source), ''), 'landing_page'),
    'NEW'
  )
  returning * into v_row;

  v_customer_id := public.upsert_customer_by_identity(
    v_org_id,
    p_customer_name,
    p_customer_phone,
    coalesce(nullif(trim(p_source), ''), 'landing_page'),
    p_note
  );

  perform public.append_customer_activity(
    v_org_id,
    v_customer_id,
    'BOOKING_REQUEST',
    'WEB',
    'Tạo yêu cầu đặt lịch ' || to_char(v_start at time zone 'Asia/Bangkok', 'DD/MM HH24:MI'),
    null
  );

  return jsonb_build_object(
    'booking_request_id', v_row.id,
    'status', v_row.status
  );
end;
$$;

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
      and ur.role in ('OWNER', 'MANAGER', 'RECEPTION')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into v_req
  from public.booking_requests
  where id = p_booking_request_id
    and org_id = v_org_id;

  if not found then
    raise exception 'BOOKING_REQUEST_NOT_FOUND';
  end if;

  if v_req.status = 'CONVERTED' then
    raise exception 'BOOKING_REQUEST_ALREADY_CONVERTED';
  end if;

  v_start := coalesce(p_start_at, v_req.requested_start_at);
  v_end := coalesce(p_end_at, v_req.requested_end_at, v_start + interval '60 minutes');

  if v_end <= v_start then
    raise exception 'INVALID_TIME_RANGE';
  end if;

  v_customer_id := public.upsert_customer_by_identity(
    v_org_id,
    v_req.customer_name,
    v_req.customer_phone,
    v_req.source,
    v_req.note
  );

  insert into public.appointments (
    org_id,
    branch_id,
    customer_id,
    staff_user_id,
    resource_id,
    start_at,
    end_at,
    status
  )
  values (
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
  set
    appointment_id = v_appointment_id,
    status = 'CONVERTED'
  where id = v_req.id;

  perform public.refresh_customer_metrics(v_customer_id, null);

  return jsonb_build_object(
    'booking_request_id', v_req.id,
    'appointment_id', v_appointment_id,
    'status', 'CONVERTED'
  );
end;
$$;

grant execute on function public.append_customer_activity(uuid, uuid, text, text, text, uuid) to authenticated, service_role;
grant execute on function public.upsert_customer_by_identity(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.refresh_customer_metrics(uuid, uuid) to authenticated, service_role;
grant execute on function public.list_customers_crm(text, text, int, boolean, text) to authenticated;
grant execute on function public.get_customer_crm_detail(uuid) to authenticated;
grant execute on function public.update_customer_care_note(uuid, text, text[], timestamptz, text) to authenticated;
grant execute on function public.list_follow_up_candidates(timestamptz, timestamptz) to authenticated;
