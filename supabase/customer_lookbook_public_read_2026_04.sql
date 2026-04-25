begin;

alter table public.services enable row level security;

drop policy if exists "public read lookbook services" on public.services;
create policy "public read lookbook services" on public.services
for select
using (
  active = true
  and featured_in_lookbook = true
);

commit;
