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
