-- Cleanup legacy checkout RPC overload to avoid PostgREST ambiguity

drop function if exists public.checkout_close_ticket_secure(
  text, text, jsonb, uuid, integer
);

grant execute on function public.checkout_close_ticket_secure(
  text, text, jsonb, uuid, integer, text
) to authenticated;
