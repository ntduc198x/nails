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
