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
