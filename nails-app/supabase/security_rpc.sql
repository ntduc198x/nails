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
