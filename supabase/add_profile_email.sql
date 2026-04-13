alter table public.profiles add column if not exists email text;

drop function if exists public.list_team_members_secure_v2();

create function public.list_team_members_secure_v2()
returns table (
  id uuid,
  user_id uuid,
  role text,
  display_name text,
  email text
)
language sql
security definer
set search_path = public
as $$
  select
    ur.id,
    ur.user_id,
    ur.role::text,
    coalesce(nullif(trim(p.display_name), ''), left(ur.user_id::text, 8)) as display_name,
    nullif(trim(p.email), '') as email
  from public.user_roles ur
  left join public.profiles p on p.user_id = ur.user_id
  where ur.org_id = (
    select org_id from public.user_roles where user_id = auth.uid() limit 1
  )
  order by ur.role asc, ur.user_id asc
$$;

grant execute on function public.list_team_members_secure_v2() to authenticated;
