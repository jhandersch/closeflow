-- MFA recovery codes for emergency account recovery

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, code_hash)
);

create index if not exists idx_mfa_recovery_codes_user_id on public.mfa_recovery_codes(user_id);
create index if not exists idx_mfa_recovery_codes_user_unused on public.mfa_recovery_codes(user_id, used_at);

alter table public.mfa_recovery_codes enable row level security;

drop policy if exists mfa_recovery_codes_self_select on public.mfa_recovery_codes;
create policy mfa_recovery_codes_self_select on public.mfa_recovery_codes
for select
using (user_id = auth.uid());

drop policy if exists mfa_recovery_codes_self_insert on public.mfa_recovery_codes;
create policy mfa_recovery_codes_self_insert on public.mfa_recovery_codes
for insert
with check (user_id = auth.uid());

drop policy if exists mfa_recovery_codes_self_update on public.mfa_recovery_codes;
create policy mfa_recovery_codes_self_update on public.mfa_recovery_codes
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists mfa_recovery_codes_self_delete on public.mfa_recovery_codes;
create policy mfa_recovery_codes_self_delete on public.mfa_recovery_codes
for delete
using (user_id = auth.uid());
