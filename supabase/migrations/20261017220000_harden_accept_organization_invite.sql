-- Hardens the legacy accept_organization_invite RPC:
--  * the invited email is taken from the authenticated user only (p_email is ignored,
--    so a caller cannot claim an invite by supplying someone else's address),
--  * the account email must be confirmed,
--  * digest() is resolved via the `extensions` schema (where Supabase installs pgcrypto);
--    with the previous search_path=public every token-based accept failed locally,
--  * the invite row is locked (FOR UPDATE) so concurrent accepts serialize and the
--    loser sees the already accepted invite instead of racing it.
-- Signature is unchanged for the existing client call.
create or replace function public.accept_organization_invite(
  p_invite_id uuid default null,
  p_email text default null,
  p_member_name text default null,
  p_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_auth_user_id uuid;
  v_auth_email text;
  v_confirmed timestamptz;
  v_token_hash text;
  v_invite record;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_auth_email, v_confirmed
  from auth.users u
  where u.id = v_auth_user_id;

  if coalesce(v_auth_email, '') = '' or v_confirmed is null then
    return null;
  end if;

  v_token_hash := case
    when p_token is null or trim(p_token) = '' then null
    else encode(digest(trim(p_token), 'sha256'), 'hex')
  end;

  select i.*
    into v_invite
  from public.organization_invites i
  where i.status = 'pending'
    and (p_invite_id is null or i.id = p_invite_id)
    and (i.expires_at is null or i.expires_at > now())
    and lower(i.email) = v_auth_email
    and (v_token_hash is null or i.token_hash = v_token_hash)
  order by i.created_at asc
  limit 1
  for update of i;

  if v_invite is null then
    return null;
  end if;

  insert into public.organization_members (
    organization_id,
    member_user_id,
    member_email,
    member_name,
    role,
    status
  )
  values (
    v_invite.organization_id,
    v_auth_user_id,
    lower(v_invite.email),
    p_member_name,
    v_invite.role,
    'active'
  )
  on conflict (organization_id, member_email)
  do update set
    member_user_id = excluded.member_user_id,
    member_name = coalesce(excluded.member_name, public.organization_members.member_name),
    role = excluded.role,
    status = 'active';

  update public.organization_invites
  set
    status = 'accepted',
    accepted_at = now(),
    token_hash = null,
    updated_at = now()
  where id = v_invite.id;

  insert into public.organization_audit_events (
    organization_id,
    actor_user_id,
    event_type,
    event_payload
  )
  values (
    v_invite.organization_id,
    v_auth_user_id,
    'invite_accepted',
    jsonb_build_object(
      'email', lower(v_invite.email),
      'role', v_invite.role,
      'invite_id', v_invite.id
    )
  );

  return v_invite.organization_id;
end;
$$;

revoke all on function public.accept_organization_invite(uuid, text, text, text) from public, anon;
grant execute on function public.accept_organization_invite(uuid, text, text, text) to authenticated;
