create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  code text not null,
  created_by uuid,
  allowed_role text not null check (allowed_role in ('MANAGER','RECEPTION','ACCOUNTANT','TECH')) default 'TECH',
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  max_uses int not null default 1 check (max_uses = 1),
  used_count int not null default 0 check (used_count >= 0 and used_count <= max_uses),
  used_by uuid,
  used_at timestamptz,
  revoked_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

alter table public.invite_codes enable row level security;

drop policy if exists "owner dev read invite codes" on public.invite_codes;
create policy "owner dev read invite codes" on public.invite_codes
for select using (
  org_id = public.my_org_id() and (
    public.has_role('OWNER')
    or auth.jwt() ->> 'role' = 'service_role'
  )
);

create or replace function public.generate_invite_code_secure(
  p_allowed_role text default 'TECH',
  p_note text default null
)
returns public.invite_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_role text;
  v_code text;
  v_row public.invite_codes;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select p.org_id into v_org_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;

  if v_org_id is null then
    raise exception 'ORG_CONTEXT_REQUIRED';
  end if;

  if not (public.has_role('OWNER')) then
    raise exception 'FORBIDDEN';
  end if;

  v_role := coalesce(nullif(trim(p_allowed_role), ''), 'TECH');
  if v_role not in ('MANAGER','RECEPTION','ACCOUNTANT','TECH') then
    raise exception 'INVALID_ROLE';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.invite_codes (org_id, code, created_by, allowed_role, expires_at, note)
      values (v_org_id, v_code, auth.uid(), v_role, now() + interval '15 minutes', nullif(trim(p_note), ''))
      returning * into v_row;
      exit;
    exception when unique_violation then
    end;
  end loop;

  return v_row;
end;
$$;

create or replace function public.revoke_invite_code_secure(
  p_invite_id uuid
)
returns public.invite_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_row public.invite_codes;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select p.org_id into v_org_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;

  if v_org_id is null then
    raise exception 'ORG_CONTEXT_REQUIRED';
  end if;

  if not (public.has_role('OWNER')) then
    raise exception 'FORBIDDEN';
  end if;

  update public.invite_codes
  set revoked_at = now()
  where id = p_invite_id
    and org_id = v_org_id
    and revoked_at is null
    and used_count < max_uses
  returning * into v_row;

  if v_row.id is null then
    raise exception 'INVITE_NOT_FOUND_OR_FINALIZED';
  end if;

  return v_row;
end;
$$;

create or replace function public.consume_invite_code_secure(
  p_code text,
  p_user_id uuid,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invite_codes;
  v_branch_id uuid;
  v_display_name text;
begin
  if p_user_id is null then
    raise exception 'USER_REQUIRED';
  end if;

  select * into v_invite
  from public.invite_codes
  where code = upper(trim(p_code))
    and revoked_at is null
    and used_count < max_uses
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if v_invite.id is null then
    raise exception 'INVITE_INVALID';
  end if;

  update public.invite_codes
  set used_count = used_count + 1,
      used_by = p_user_id,
      used_at = now()
  where id = v_invite.id
    and used_count < max_uses;

  if not found then
    raise exception 'INVITE_ALREADY_USED';
  end if;

  select id into v_branch_id
  from public.branches
  where org_id = v_invite.org_id
  order by created_at asc
  limit 1;

  v_display_name := nullif(trim(coalesce(p_display_name, '')), '');

  insert into public.profiles (user_id, org_id, default_branch_id, display_name)
  values (p_user_id, v_invite.org_id, v_branch_id, coalesce(v_display_name, 'User'))
  on conflict (user_id) do update
    set org_id = excluded.org_id,
        default_branch_id = excluded.default_branch_id,
        display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name, 'User');

  insert into public.user_roles (user_id, org_id, role)
  values (p_user_id, v_invite.org_id, v_invite.allowed_role)
  on conflict (user_id, org_id, role) do nothing;

  return jsonb_build_object(
    'inviteId', v_invite.id,
    'orgId', v_invite.org_id,
    'role', v_invite.allowed_role,
    'expiresAt', v_invite.expires_at
  );
end;
$$;

grant execute on function public.generate_invite_code_secure(text, text) to authenticated;
grant execute on function public.revoke_invite_code_secure(uuid) to authenticated;
grant execute on function public.consume_invite_code_secure(text, uuid, text) to anon, authenticated;
