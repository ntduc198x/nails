-- Allow TECH to operate core flow: create customers, create own appointments, read/write tickets+payments,
-- and use checkout RPC the same way as reception.

begin;

-- Appointments
DROP POLICY IF EXISTS "tech insert own appointments" ON public.appointments;
CREATE POLICY "tech insert own appointments" ON public.appointments
FOR INSERT WITH CHECK (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
  AND staff_user_id = auth.uid()
);

DROP POLICY IF EXISTS "tech update own appointments" ON public.appointments;
CREATE POLICY "tech update own appointments" ON public.appointments
FOR UPDATE USING (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
  AND staff_user_id = auth.uid()
)
WITH CHECK (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
  AND staff_user_id = auth.uid()
);

-- Customers
DROP POLICY IF EXISTS "tech write customers" ON public.customers;
CREATE POLICY "tech write customers" ON public.customers
FOR ALL USING (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
)
WITH CHECK (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
);

-- Tickets
DROP POLICY IF EXISTS "tech read tickets" ON public.tickets;
CREATE POLICY "tech read tickets" ON public.tickets
FOR SELECT USING (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
);

DROP POLICY IF EXISTS "tech write tickets" ON public.tickets;
CREATE POLICY "tech write tickets" ON public.tickets
FOR ALL USING (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
)
WITH CHECK (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
);

-- Payments
DROP POLICY IF EXISTS "tech read payments" ON public.payments;
CREATE POLICY "tech read payments" ON public.payments
FOR SELECT USING (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
);

DROP POLICY IF EXISTS "tech write payments" ON public.payments;
CREATE POLICY "tech write payments" ON public.payments
FOR ALL USING (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
)
WITH CHECK (
  org_id = public.my_org_id()
  AND public.has_role('TECH')
);

-- Checkout RPC: same body as deploy.sql, only expand allowed role list to include TECH
create or replace function public.create_checkout_secure(
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
      and ur.role in ('OWNER', 'MANAGER', 'RECEPTION', 'TECH')
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

grant execute on function public.create_checkout_secure(text, text, jsonb, uuid, integer, text) to authenticated;

commit;
