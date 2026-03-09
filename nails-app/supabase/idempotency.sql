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
