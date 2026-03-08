-- Patch gỡ kẹt auth sau khi bật RLS
-- Chạy file này nếu app bị treo ở "Đang kiểm tra đăng nhập..."

-- 1) profiles: cho phép user tự quản lý profile của chính họ
create policy if not exists "profiles select own" on profiles
for select using (user_id = auth.uid());

create policy if not exists "profiles insert own" on profiles
for insert with check (user_id = auth.uid());

create policy if not exists "profiles update own" on profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) orgs/branches bootstrap: tạm mở cho authenticated để khởi tạo ban đầu
create policy if not exists "orgs auth read" on orgs
for select using (auth.uid() is not null);

create policy if not exists "orgs auth insert" on orgs
for insert with check (auth.uid() is not null);

create policy if not exists "branches auth read" on branches
for select using (auth.uid() is not null);

create policy if not exists "branches auth insert" on branches
for insert with check (auth.uid() is not null);

-- 3) user_roles: cho phép user tự bootstrap role cho chính họ,
-- owner/manager vẫn có quyền quản lý toàn org theo policy cũ.
create policy if not exists "user_roles self bootstrap insert" on user_roles
for insert with check (user_id = auth.uid());
