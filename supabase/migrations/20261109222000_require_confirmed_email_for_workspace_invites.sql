-- Do not allow an unconfirmed account to claim a workspace invitation.
create or replace function public.accept_workspace_invite_with_limit(p_token text)
returns table (workspace_id uuid, already_member boolean)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_invite public.workspace_invites%rowtype;
  v_email text;
  v_confirmed_at timestamptz;
  v_plan text;
  v_limit integer;
  v_seats integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_email, v_confirmed_at
  from auth.users as u
  where u.id = auth.uid();

  if v_confirmed_at is null then
    raise exception 'Email confirmation required'
      using errcode = '42501';
  end if;

  if p_token is null
     or length(p_token) = 0
     or length(p_token) > 512 then
    raise exception 'Invalid invitation token'
      using errcode = '22023';
  end if;

  select wi.*
  into v_invite
  from public.workspace_invites as wi
  where wi.token = p_token
  for update;

  if not found then
    raise exception 'Invitation not found'
      using errcode = 'P0002';
  end if;

  if v_invite.expires_at is not null
     and v_invite.expires_at <= pg_catalog.now() then
    raise exception 'Invitation has expired'
      using errcode = '22023';
  end if;

  if v_email is null
     or v_email <> lower(v_invite.email) then
    raise exception 'Invitation email mismatch'
      using errcode = '42501';
  end if;

  perform 1
  from public.workspaces as w
  where w.id = v_invite.workspace_id
  for update;
  if not found then
    raise exception 'Workspace not found'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.workspace_members as wm
    where wm.workspace_id = v_invite.workspace_id
      and wm.user_id = auth.uid()
  ) then
    delete from public.workspace_invites as wi
    where wi.id = v_invite.id;

    return query select v_invite.workspace_id, true;
    return;
  end if;

  v_plan := public.workspace_plan_tier(v_invite.workspace_id);
  v_limit := case v_plan when 'pro' then 5 when 'business' then 20 else 1 end;

  select
    (select count(*) from public.workspace_members as wm
     where wm.workspace_id = v_invite.workspace_id)
    +
    (select count(*) from public.workspace_invites as wi
     where wi.workspace_id = v_invite.workspace_id
       and wi.accepted_at is null
       and (wi.expires_at is null or wi.expires_at > pg_catalog.now()))
  into v_seats;

  if v_seats > v_limit then
    raise exception 'Team seat limit reached for % plan (%/%)',
      pg_catalog.upper(v_plan), v_seats, v_limit
      using errcode = '23514',
            constraint = 'workspace_team_seat_capacity';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, auth.uid(), v_invite.role);

  delete from public.workspace_invites as wi
  where wi.id = v_invite.id;

  return query select v_invite.workspace_id, false;
end;
$$;

revoke all on function public.accept_workspace_invite_with_limit(text) from public, anon;
grant execute on function public.accept_workspace_invite_with_limit(text) to authenticated;
