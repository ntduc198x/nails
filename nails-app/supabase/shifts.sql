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
