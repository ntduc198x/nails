-- Add DEV role for internal testing without impacting salon operation flows directly.

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (role in ('OWNER','MANAGER','RECEPTION','ACCOUNTANT','TECH','DEV'));

alter table public.invite_codes drop constraint if exists invite_codes_allowed_role_check;
alter table public.invite_codes add constraint invite_codes_allowed_role_check check (allowed_role in ('MANAGER','RECEPTION','ACCOUNTANT','TECH','DEV'));

-- DEV exists for preview/testing only.
-- DEV should be treated as read-only at app layer and DB layer.
-- Apply dev_readonly_guardrails.sql alongside this file to lock the contract clearly.
