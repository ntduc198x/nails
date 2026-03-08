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
