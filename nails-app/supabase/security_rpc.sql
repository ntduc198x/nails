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
