-- Hardens create_organization_invite:
--  * search_path includes "extensions" so digest() resolves wherever pgcrypto lives
--  * only an active Owner may invite someone as Owner or Admin (no Admin -> Owner escalation)
--  * invite lifetime is capped at 30 days
begin;

create or replace function public.create_organization_invite(
  p_organization_id uuid,
  p_email text,
  p_role text default 'Sales',
  p_expires_in_hours integer default 168
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_auth_user_id uuid;
  v_actor_role text;
  v_email text;
  v_role text;
  v_hours integer;
  v_token text;
  v_token_hash text;
  v_invite_id uuid;
  v_existing_invite_id uuid;
  v_event_type text;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  v_role := coalesce(p_role, 'Sales');
  v_hours := least(greatest(coalesce(p_expires_in_hours, 168), 1), 720);

  if v_email = '' then
    raise exception 'Invite email is required';
  end if;

  if v_role not in ('Owner', 'Admin', 'Sales Manager', 'Sales', 'Sales Rep', 'Viewer') then
    raise exception 'Invalid role';
  end if;

  select m.role
    into v_actor_role
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.member_user_id = v_auth_user_id
    and m.status = 'active'
    and m.role in ('Owner', 'Admin')
  order by case m.role when 'Owner' then 0 else 1 end
  limit 1;

  if v_actor_role is null then
    raise exception 'Not authorized to invite members';
  end if;

  if v_role in ('Owner', 'Admin') and v_actor_role <> 'Owner' then
    raise exception 'Only an owner can invite owners or admins';
  end if;

  select i.id
    into v_existing_invite_id
  from public.organization_invites i
  where i.organization_id = p_organization_id
    and lower(i.email) = v_email
    and i.status = 'pending'
  limit 1;

  v_event_type := case when v_existing_invite_id is null then 'invite_created' else 'invite_refreshed' end;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.organization_invites (
    organization_id,
    email,
    token_hash,
    role,
    status,
    invited_by,
    expires_at,
    updated_at
  )
  values (
    p_organization_id,
    v_email,
    v_token_hash,
    v_role,
    'pending',
    v_auth_user_id,
    now() + make_interval(hours => v_hours),
    now()
  )
  on conflict (organization_id, email)
  do update set
    token_hash = excluded.token_hash,
    role = excluded.role,
    status = 'pending',
    invited_by = excluded.invited_by,
    expires_at = excluded.expires_at,
    accepted_at = null,
    updated_at = now()
  returning id into v_invite_id;

  insert into public.organization_audit_events (
    organization_id,
    actor_user_id,
    event_type,
    event_payload
  )
  values (
    p_organization_id,
    v_auth_user_id,
    v_event_type,
    jsonb_build_object(
      'email', v_email,
      'role', v_role,
      'invite_id', v_invite_id,
      'expires_at', now() + make_interval(hours => v_hours)
    )
  );

  return v_token;
end;
$$;

revoke all on function public.create_organization_invite(uuid, text, text, integer)
  from public, anon;
grant execute on function public.create_organization_invite(uuid, text, text, integer)
  to authenticated;

commit;
