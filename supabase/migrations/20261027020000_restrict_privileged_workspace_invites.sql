-- Restores the privilege-escalation fix (finding E) that the atomic seat-limit
-- migration overwrote: only owners may invite the privileged roles owner/admin.
-- Behavior for all other roles and the seat limit is unchanged.

create or replace function public.create_workspace_invite_with_limit(
  p_workspace_id uuid,
  p_email text,
  p_role text,
  p_token text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor_role text;
  v_role text;
  v_email text;
  v_plan text;
  v_limit integer;
  v_seats integer;
  v_invite_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_workspace_id is null then
    raise exception 'Workspace is required'
      using errcode = '22023';
  end if;

  v_role := lower(trim(coalesce(p_role, '')));
  v_email := lower(trim(coalesce(p_email, '')));

  if v_email = '' or length(v_email) > 320 then
    raise exception 'Invalid email'
      using errcode = '22023';
  end if;

  if v_role not in (
    'owner', 'admin', 'sales_manager',
    'sales_rep', 'member', 'viewer'
  ) then
    raise exception 'Invalid invite role'
      using errcode = '22023';
  end if;

  if p_token is null
     or length(trim(p_token)) = 0
     or length(p_token) > 512 then
    raise exception 'Invalid invitation token'
      using errcode = '22023';
  end if;

  if p_expires_at is not null
     and p_expires_at <= pg_catalog.now() then
    raise exception 'Invitation expiry must be in the future'
      using errcode = '22023';
  end if;

  -- Serialize seat allocation for this workspace.
  perform 1
  from public.workspaces as w
  where w.id = p_workspace_id
  for update;
  if not found then
    raise exception 'Workspace not found'
      using errcode = 'P0002';
  end if;

  select wm.role
  into v_actor_role
  from public.workspace_members as wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = auth.uid()
    and wm.role in ('owner', 'admin', 'sales_manager');

  if not found then
    raise exception 'Workspace manager access required'
      using errcode = '42501';
  end if;

  -- Only owners may invite owner/admin; sales managers only non-privileged roles.
  if v_role in ('owner', 'admin') and v_actor_role <> 'owner' then
    raise exception 'Insufficient permission to assign this role'
      using errcode = '42501';
  end if;
  if v_actor_role = 'sales_manager'
     and v_role not in ('sales_rep', 'member', 'viewer') then
    raise exception 'Insufficient permission to assign this role'
      using errcode = '42501';
  end if;

  v_plan := public.workspace_plan_tier(p_workspace_id);
  v_limit := case v_plan when 'pro' then 5 when 'business' then 20 else 1 end;

  select
    (select count(*)
     from public.workspace_members as wm
     where wm.workspace_id = p_workspace_id)
    +
    (select count(*)
     from public.workspace_invites as wi
     where wi.workspace_id = p_workspace_id
       and wi.accepted_at is null
       and (
         wi.expires_at is null
         or wi.expires_at > pg_catalog.now()
       ))
  into v_seats;

  if v_seats >= v_limit then
    raise exception 'Team seat limit reached for % plan (%/%)',
      pg_catalog.upper(v_plan), v_seats, v_limit
      using errcode = '23514',
            constraint = 'workspace_team_seat_capacity';
  end if;

  insert into public.workspace_invites (
    workspace_id, email, role, token, expires_at
  )
  values (
    p_workspace_id, v_email, v_role, p_token, p_expires_at
  )
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

revoke all on function public.create_workspace_invite_with_limit(uuid, text, text, text, timestamptz) from public, anon;
grant execute on function public.create_workspace_invite_with_limit(uuid, text, text, text, timestamptz) to authenticated;
