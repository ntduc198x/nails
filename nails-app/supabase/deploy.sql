-- Unified Supabase deploy script (single-file setup)
-- This file consolidates schema + RLS + RPC + integrity + indexes.


-- ===== BEGIN schema.sql =====
-- Nails App MVP schema (rút gọn để bắt đầu nhanh)
create extension if not exists "pgcrypto";

create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  timezone text not null default 'Asia/Bangkok',
  currency text not null default 'VND',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key,
  org_id uuid not null references orgs(id) on delete cascade,
  default_branch_id uuid references branches(id),
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  org_id uuid not null references orgs(id) on delete cascade,
  role text not null check (role in ('OWNER','MANAGER','RECEPTION','ACCOUNTANT','TECH')),
  unique (user_id, org_id, role)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  duration_min int not null,
  base_price numeric(12,2) not null,
  vat_rate numeric(5,4) not null default 0.10,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  customer_id uuid references customers(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null check (status in ('BOOKED','CHECKED_IN','DONE','CANCELLED','NO_SHOW')),
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  customer_id uuid references customers(id),
  appointment_id uuid references appointments(id),
  status text not null check (status in ('OPEN','CLOSED','VOID')) default 'OPEN',
  totals_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ticket_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  service_id uuid references services(id),
  qty int not null default 1,
  unit_price numeric(12,2) not null,
  vat_rate numeric(5,4) not null,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  method text not null check (method in ('CASH','TRANSFER')),
  amount numeric(12,2) not null,
  status text not null check (status in ('PENDING','PAID','FAILED')),
  created_at timestamptz not null default now()
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  public_token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ===== END schema.sql =====

-- ===== BEGIN rls.sql =====
-- RLS baseline cho Nails App (chạy sau schema.sql)

alter table orgs enable row level security;
alter table branches enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table customers enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table tickets enable row level security;
alter table ticket_items enable row level security;
alter table payments enable row level security;
alter table receipts enable row level security;

create or replace function public.my_org_id()
returns uuid
language sql
stable
as $$
  select org_id from public.profiles where user_id = auth.uid() limit 1
$$;

create or replace function public.has_role(_role text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.org_id = public.my_org_id()
      and ur.role = _role
  )
$$;

-- Generic org policies
create policy "org read services" on services
for select using (org_id = public.my_org_id());

create policy "owner manager reception write services" on services
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
);

create policy "org read appointments" on appointments
for select using (org_id = public.my_org_id());

create policy "owner manager reception write appointments" on appointments
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
);

create policy "org read customers" on customers
for select using (org_id = public.my_org_id());

create policy "owner manager reception write customers" on customers
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
);

-- Payments/tickets: TECH không được đọc
create policy "owner manager reception accountant read tickets" on tickets
for select using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION') or public.has_role('ACCOUNTANT'))
);

create policy "owner manager reception write tickets" on tickets
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
);

create policy "owner manager reception accountant read payments" on payments
for select using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION') or public.has_role('ACCOUNTANT'))
);

create policy "owner manager reception write payments" on payments
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
);

-- user_roles: chỉ owner/manager chỉnh
create policy "read own org roles" on user_roles
for select using (org_id = public.my_org_id());

create policy "owner manager write roles" on user_roles
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER'))
);

-- ===== END rls.sql =====

-- ===== BEGIN rls_patch_v2.sql =====
-- Patch gỡ kẹt auth + ticket detail sau khi bật RLS
-- Chạy file này trong Supabase SQL Editor

-- 1) profiles: cho phép user tự quản lý profile của chính họ
drop policy if exists "profiles select own" on profiles;
create policy "profiles select own" on profiles
for select using (user_id = auth.uid());

drop policy if exists "profiles insert own" on profiles;
create policy "profiles insert own" on profiles
for insert with check (user_id = auth.uid());

drop policy if exists "profiles update own" on profiles;
create policy "profiles update own" on profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) orgs/branches bootstrap: tạm mở cho authenticated để khởi tạo ban đầu
drop policy if exists "orgs auth read" on orgs;
create policy "orgs auth read" on orgs
for select using (auth.uid() is not null);

drop policy if exists "orgs auth insert" on orgs;
create policy "orgs auth insert" on orgs
for insert with check (auth.uid() is not null);

drop policy if exists "branches auth read" on branches;
create policy "branches auth read" on branches
for select using (auth.uid() is not null);

drop policy if exists "branches auth insert" on branches;
create policy "branches auth insert" on branches
for insert with check (auth.uid() is not null);

-- 3) user_roles: cho phép user tự bootstrap role cho chính họ
drop policy if exists "user_roles self bootstrap insert" on user_roles;
create policy "user_roles self bootstrap insert" on user_roles
for insert with check (user_id = auth.uid());

-- 4) ticket_items: cho role tài chính đọc item, lễ tân/manager/owner ghi được
drop policy if exists "ticket_items role read" on ticket_items;
create policy "ticket_items role read" on ticket_items
for select using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION') or public.has_role('ACCOUNTANT'))
);

drop policy if exists "ticket_items reception write" on ticket_items;
create policy "ticket_items reception write" on ticket_items
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
);

-- 5) receipts: cho role tài chính đọc được token receipt
drop policy if exists "receipts role read" on receipts;
create policy "receipts role read" on receipts
for select using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION') or public.has_role('ACCOUNTANT'))
);

drop policy if exists "receipts reception write" on receipts;
create policy "receipts reception write" on receipts
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION'))
);

-- ===== END rls_patch_v2.sql =====

-- ===== BEGIN security_rpc.sql =====
-- Secure RPCs để hạn chế query trực tiếp bảng nhạy cảm

create or replace function public.get_ticket_detail_secure(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_ticket record;
  v_allowed boolean;
  v_customer jsonb;
  v_payment jsonb;
  v_receipt jsonb;
  v_items jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select t.* into v_ticket
  from tickets t
  where t.id = p_ticket_id;

  if not found then
    raise exception 'TICKET_NOT_FOUND';
  end if;

  select exists (
    select 1
    from user_roles ur
    where ur.user_id = v_uid
      and ur.org_id = v_ticket.org_id
      and ur.role in ('OWNER', 'MANAGER', 'RECEPTION', 'ACCOUNTANT')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'FORBIDDEN';
  end if;

  select to_jsonb(c) into v_customer
  from (
    select name, phone
    from customers
    where id = v_ticket.customer_id
    limit 1
  ) c;

  select to_jsonb(p) into v_payment
  from (
    select method, amount, status, created_at
    from payments
    where ticket_id = v_ticket.id
    order by created_at desc
    limit 1
  ) p;

  select to_jsonb(r) into v_receipt
  from (
    select public_token, expires_at
    from receipts
    where ticket_id = v_ticket.id
    order by created_at desc
    limit 1
  ) r;

  select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) into v_items
  from (
    select
      ti.qty,
      ti.unit_price,
      ti.vat_rate,
      coalesce(s.name, '(service deleted)') as service_name
    from ticket_items ti
    left join services s on s.id = ti.service_id
    where ti.ticket_id = v_ticket.id
    order by ti.created_at asc
  ) i;

  return jsonb_build_object(
    'ticket', jsonb_build_object(
      'id', v_ticket.id,
      'created_at', v_ticket.created_at,
      'status', v_ticket.status,
      'totals_json', v_ticket.totals_json
    ),
    'customer', coalesce(v_customer, '{}'::jsonb),
    'payment', coalesce(v_payment, '{}'::jsonb),
    'receipt', coalesce(v_receipt, '{}'::jsonb),
    'items', v_items
  );
end;
$$;

grant execute on function public.get_ticket_detail_secure(uuid) to authenticated;

create or replace function public.get_report_breakdown_secure(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_org_id uuid;
  v_allowed boolean;
  v_summary jsonb;
  v_by_service jsonb;
  v_by_payment jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select org_id into v_org_id from profiles where user_id = v_uid limit 1;
  if v_org_id is null then
    raise exception 'ORG_NOT_FOUND';
  end if;

  select exists (
    select 1 from user_roles ur
    where ur.user_id = v_uid
      and ur.org_id = v_org_id
      and ur.role in ('OWNER','MANAGER','RECEPTION','ACCOUNTANT')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'count', count(*)::int,
    'subtotal', coalesce(sum((t.totals_json->>'subtotal')::numeric), 0),
    'vat', coalesce(sum((t.totals_json->>'vat_total')::numeric), 0),
    'revenue', coalesce(sum((t.totals_json->>'grand_total')::numeric), 0)
  )
  into v_summary
  from tickets t
  where t.org_id = v_org_id
    and t.status = 'CLOSED'
    and t.created_at >= p_from
    and t.created_at < p_to;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  into v_by_service
  from (
    select coalesce(s.name, '(service deleted)') as service_name,
           sum(ti.qty)::int as qty,
           coalesce(sum(ti.qty * ti.unit_price), 0)::numeric as subtotal
    from ticket_items ti
    join tickets t on t.id = ti.ticket_id
    left join services s on s.id = ti.service_id
    where t.org_id = v_org_id
      and t.status = 'CLOSED'
      and t.created_at >= p_from
      and t.created_at < p_to
    group by coalesce(s.name, '(service deleted)')
    order by subtotal desc
  ) x;

  select coalesce(jsonb_agg(to_jsonb(y)), '[]'::jsonb)
  into v_by_payment
  from (
    select p.method,
           count(*)::int as count,
           coalesce(sum(p.amount), 0)::numeric as amount
    from payments p
    join tickets t on t.id = p.ticket_id
    where t.org_id = v_org_id
      and t.status = 'CLOSED'
      and t.created_at >= p_from
      and t.created_at < p_to
    group by p.method
    order by amount desc
  ) y;

  return jsonb_build_object(
    'summary', coalesce(v_summary, '{}'::jsonb),
    'by_service', v_by_service,
    'by_payment', v_by_payment
  );
end;
$$;

grant execute on function public.get_report_breakdown_secure(timestamptz, timestamptz) to authenticated;

-- ===== END security_rpc.sql =====

-- ===== BEGIN public_receipt_rpc.sql =====
-- Public receipt RPC for token-based online sharing (no auth required)

create or replace function public.get_receipt_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt record;
  v_ticket record;
  v_customer jsonb;
  v_payment jsonb;
  v_items jsonb;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'TOKEN_REQUIRED';
  end if;

  select r.ticket_id, r.expires_at
  into v_receipt
  from receipts r
  where r.public_token = p_token
    and r.expires_at > now()
  limit 1;

  if not found then
    raise exception 'RECEIPT_NOT_FOUND_OR_EXPIRED';
  end if;

  select t.id, t.created_at, t.totals_json, t.customer_id
  into v_ticket
  from tickets t
  where t.id = v_receipt.ticket_id
  limit 1;

  if not found then
    raise exception 'TICKET_NOT_FOUND';
  end if;

  select to_jsonb(c) into v_customer
  from (
    select name
    from customers
    where id = v_ticket.customer_id
    limit 1
  ) c;

  select to_jsonb(p) into v_payment
  from (
    select method, amount, status
    from payments
    where ticket_id = v_ticket.id
    order by created_at desc
    limit 1
  ) p;

  select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
  into v_items
  from (
    select
      ti.qty,
      ti.unit_price,
      ti.vat_rate,
      coalesce(s.name, '(service deleted)') as service_name
    from ticket_items ti
    left join services s on s.id = ti.service_id
    where ti.ticket_id = v_ticket.id
    order by ti.created_at asc
  ) i;

  return jsonb_build_object(
    'ticket', jsonb_build_object(
      'id', v_ticket.id,
      'created_at', v_ticket.created_at,
      'totals_json', v_ticket.totals_json
    ),
    'customer', coalesce(v_customer, '{}'::jsonb),
    'payment', coalesce(v_payment, '{}'::jsonb),
    'items', v_items
  );
end;
$$;

grant execute on function public.get_receipt_public(text) to anon, authenticated;

-- ===== END public_receipt_rpc.sql =====

-- ===== BEGIN idempotency.sql =====
-- Idempotency support for checkout requests

create table if not exists public.checkout_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  idempotency_key text not null,
  ticket_id uuid references public.tickets(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (org_id, idempotency_key)
);

alter table public.checkout_requests enable row level security;

-- app uses SECURITY DEFINER RPC, deny direct table access by default

-- ===== END idempotency.sql =====

-- ===== BEGIN checkout_rpc.sql =====
-- Atomic checkout RPC (ticket + items + payment + receipt + appointment update)
-- Run after schema.sql + rls.sql + security_rpc.sql

create or replace function public.checkout_close_ticket_secure(
  p_customer_name text,
  p_payment_method text,
  p_lines jsonb,
  p_appointment_id uuid default null,
  p_dedupe_window_ms int default 15000,
  p_idempotency_key text default null
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
  v_customer_id uuid;
  v_subtotal numeric := 0;
  v_vat_total numeric := 0;
  v_grand_total numeric := 0;
  v_ticket_id uuid;
  v_token text;
  v_expires_at timestamptz;
  v_days int := 30;
  v_duplicate_ticket_id uuid;
  v_duplicate_token text;
  v_existing_ticket_id uuid;
  v_existing_token text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'CUSTOMER_NAME_REQUIRED';
  end if;

  if p_payment_method not in ('CASH', 'TRANSFER') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'CHECKOUT_LINES_REQUIRED';
  end if;

  select org_id, default_branch_id
  into v_org_id, v_branch_id
  from profiles
  where user_id = v_uid
  limit 1;

  if v_org_id is null then
    raise exception 'ORG_NOT_FOUND';
  end if;

  select exists (
    select 1
    from user_roles ur
    where ur.user_id = v_uid
      and ur.org_id = v_org_id
      and ur.role in ('OWNER', 'MANAGER', 'RECEPTION')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'FORBIDDEN';
  end if;

  if v_branch_id is null then
    select b.id into v_branch_id
    from branches b
    where b.org_id = v_org_id
    order by b.created_at asc
    limit 1;
  end if;

  if v_branch_id is null then
    raise exception 'BRANCH_NOT_FOUND';
  end if;

  select c.id into v_customer_id
  from customers c
  where c.org_id = v_org_id and c.name = p_customer_name
  order by c.created_at asc
  limit 1;

  if v_customer_id is null then
    insert into customers (org_id, name)
    values (v_org_id, p_customer_name)
    returning id into v_customer_id;
  end if;

  select
    coalesce(sum((s.base_price * x.qty)), 0),
    coalesce(sum((s.base_price * x.qty * s.vat_rate)), 0)
  into v_subtotal, v_vat_total
  from (
    select
      (elem->>'serviceId')::uuid as service_id,
      greatest((elem->>'qty')::int, 1) as qty
    from jsonb_array_elements(p_lines) elem
  ) x
  join services s on s.id = x.service_id and s.org_id = v_org_id;

  if v_subtotal <= 0 then
    raise exception 'INVALID_SERVICES';
  end if;

  v_grand_total := v_subtotal + v_vat_total;

  -- strict idempotency by key within org
  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    select cr.ticket_id
    into v_existing_ticket_id
    from checkout_requests cr
    where cr.org_id = v_org_id
      and cr.idempotency_key = p_idempotency_key
    limit 1;

    if v_existing_ticket_id is not null then
      select r.public_token
      into v_existing_token
      from receipts r
      where r.ticket_id = v_existing_ticket_id
      order by r.created_at desc
      limit 1;

      return jsonb_build_object(
        'ticketId', v_existing_ticket_id,
        'receiptToken', coalesce(v_existing_token, ''),
        'grandTotal', v_grand_total,
        'deduped', true
      );
    end if;
  end if;

  -- dedupe: same customer + CLOSED ticket with same grand_total in short window
  select t.id
  into v_duplicate_ticket_id
  from tickets t
  where t.org_id = v_org_id
    and t.customer_id = v_customer_id
    and t.status = 'CLOSED'
    and t.created_at >= (now() - make_interval(secs => greatest(p_dedupe_window_ms, 1000) / 1000.0))
    and abs(coalesce((t.totals_json->>'grand_total')::numeric, 0) - v_grand_total) < 0.01
  order by t.created_at desc
  limit 1;

  if v_duplicate_ticket_id is not null then
    select r.public_token
    into v_duplicate_token
    from receipts r
    where r.ticket_id = v_duplicate_ticket_id
    order by r.created_at desc
    limit 1;

    return jsonb_build_object(
      'ticketId', v_duplicate_ticket_id,
      'receiptToken', coalesce(v_duplicate_token, ''),
      'grandTotal', v_grand_total,
      'deduped', true
    );
  end if;

  insert into tickets (org_id, branch_id, customer_id, appointment_id, status, totals_json)
  values (
    v_org_id,
    v_branch_id,
    v_customer_id,
    p_appointment_id,
    'CLOSED',
    jsonb_build_object(
      'subtotal', v_subtotal,
      'discount_total', 0,
      'vat_total', v_vat_total,
      'grand_total', v_grand_total
    )
  )
  returning id into v_ticket_id;

  insert into ticket_items (org_id, ticket_id, service_id, qty, unit_price, vat_rate)
  select
    v_org_id,
    v_ticket_id,
    s.id,
    x.qty,
    s.base_price,
    s.vat_rate
  from (
    select
      (elem->>'serviceId')::uuid as service_id,
      greatest((elem->>'qty')::int, 1) as qty
    from jsonb_array_elements(p_lines) elem
  ) x
  join services s on s.id = x.service_id and s.org_id = v_org_id;

  insert into payments (org_id, ticket_id, method, amount, status)
  values (v_org_id, v_ticket_id, p_payment_method, v_grand_total, 'PAID');

  -- Avoid dependency on gen_random_bytes() availability across projects.
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_expires_at := now() + make_interval(days => v_days);

  insert into receipts (org_id, ticket_id, public_token, expires_at)
  values (v_org_id, v_ticket_id, v_token, v_expires_at);

  if p_appointment_id is not null then
    update appointments
    set status = 'DONE'
    where id = p_appointment_id
      and org_id = v_org_id;
  end if;

  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    insert into checkout_requests (org_id, idempotency_key, ticket_id, created_by)
    values (v_org_id, p_idempotency_key, v_ticket_id, v_uid)
    on conflict (org_id, idempotency_key)
    do update set ticket_id = excluded.ticket_id;
  end if;

  return jsonb_build_object(
    'ticketId', v_ticket_id,
    'receiptToken', v_token,
    'grandTotal', v_grand_total,
    'deduped', false
  );
end;
$$;

grant execute on function public.checkout_close_ticket_secure(text, text, jsonb, uuid, int, text) to authenticated;

-- ===== END checkout_rpc.sql =====

-- ===== BEGIN cleanup_checkout_rpc_overloads.sql =====
-- Cleanup legacy checkout RPC overload to avoid PostgREST ambiguity

drop function if exists public.checkout_close_ticket_secure(
  text, text, jsonb, uuid, integer
);

grant execute on function public.checkout_close_ticket_secure(
  text, text, jsonb, uuid, integer, text
) to authenticated;

-- ===== END cleanup_checkout_rpc_overloads.sql =====

-- ===== BEGIN shifts.sql =====
-- Shift/Time tracking tables + RLS

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  staff_user_id uuid not null,
  clock_in timestamptz not null,
  clock_out timestamptz,
  created_at timestamptz not null default now()
);

alter table time_entries enable row level security;

drop policy if exists "time_entries role read" on time_entries;
create policy "time_entries role read" on time_entries
for select using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION') or public.has_role('TECH'))
);

drop policy if exists "time_entries role write" on time_entries;
create policy "time_entries role write" on time_entries
for all using (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION') or public.has_role('TECH'))
)
with check (
  org_id = public.my_org_id() and
  (public.has_role('OWNER') or public.has_role('MANAGER') or public.has_role('RECEPTION') or public.has_role('TECH'))
);

-- ===== END shifts.sql =====

-- ===== BEGIN data_integrity.sql =====
-- Data integrity hardening (appointments + tickets)
-- Run this after schema.sql

-- 1) Appointment time range must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_time_range_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_time_range_check
      CHECK (end_at > start_at);
  END IF;
END $$;

-- 2) Status transition guard for appointments
CREATE OR REPLACE FUNCTION public.enforce_appointment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- only validate when status actually changes
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'BOOKED' AND NEW.status IN ('CHECKED_IN', 'DONE', 'CANCELLED', 'NO_SHOW') THEN
    RETURN NEW;
  ELSIF OLD.status = 'CHECKED_IN' AND NEW.status IN ('DONE', 'CANCELLED', 'NO_SHOW') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'INVALID_APPOINTMENT_STATUS_TRANSITION: % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_appointment_status_transition ON public.appointments;

CREATE TRIGGER trg_enforce_appointment_status_transition
BEFORE UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_appointment_status_transition();

-- 3) Prevent duplicate closed tickets for same appointment
CREATE UNIQUE INDEX IF NOT EXISTS uq_closed_ticket_per_appointment
  ON public.tickets (appointment_id)
  WHERE appointment_id IS NOT NULL AND status = 'CLOSED';

-- ===== END data_integrity.sql =====

-- ===== BEGIN perf_indexes.sql =====
-- Performance indexes cho truy vấn dashboard/reports/checkout

create index if not exists idx_tickets_org_created_at on tickets (org_id, created_at desc);
create index if not exists idx_tickets_org_status_created on tickets (org_id, status, created_at desc);
create index if not exists idx_appointments_org_start_at on appointments (org_id, start_at);
create index if not exists idx_appointments_org_status_start on appointments (org_id, status, start_at);
create index if not exists idx_ticket_items_ticket_id on ticket_items (ticket_id);
create index if not exists idx_payments_ticket_id on payments (ticket_id);
create index if not exists idx_receipts_ticket_id on receipts (ticket_id, created_at desc);
create index if not exists idx_time_entries_org_clockin on time_entries (org_id, clock_in desc);

-- ===== END perf_indexes.sql =====
