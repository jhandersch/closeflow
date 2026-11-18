-- Consume exactly one MFA recovery code atomically.
-- The user binding is checked inside the SECURITY DEFINER function because the
-- update must not be split into a read followed by a write in the API route.
create or replace function public.consume_mfa_recovery_code(p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  consumed_id uuid;
begin
  if auth.uid() is null or p_code_hash is null or length(p_code_hash) <> 64 then
    return false;
  end if;

  update public.mfa_recovery_codes
  set used_at = now()
  where user_id = auth.uid()
    and code_hash = p_code_hash
    and used_at is null
  returning id into consumed_id;

  return consumed_id is not null;
end;
$$;

revoke all on function public.consume_mfa_recovery_code(text) from public, anon;
grant execute on function public.consume_mfa_recovery_code(text) to authenticated;
