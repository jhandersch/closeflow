-- Atomically reserve metered usage and enforce workspace capacity limits.

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month text not null,
  bucket text not null check (bucket in ('ai', 'export')),
  request_key text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, month, bucket, request_key)
);

alter table public.usage_events enable row level security;

drop policy if exists usage_events_member_select on public.usage_events;
create policy usage_events_member_select
on public.usage_events
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create or replace function public.consume_workspace_usage(
  p_workspace_id uuid,
  p_month text,
  p_bucket text,
  p_request_key text
)
returns table (
  allowed boolean,
  current_count integer,
  usage_limit integer,
  plan text,
  already_counted boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_plan text;
  v_status text;
  v_period_end timestamptz;
  v_limit integer;
  v_current integer;
  v_inserted integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_bucket not in ('ai', 'export') then
    raise exception 'Invalid usage bucket' using errcode = '22023';
  end if;
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Invalid usage month' using errcode = '22023';
  end if;
  if p_month <> to_char(now() at time zone 'UTC', 'YYYY-MM') then
    raise exception 'Usage month must be the current UTC month' using errcode = '22023';
  end if;
  if p_request_key is null or length(p_request_key) = 0 or length(p_request_key) > 200 then
    raise exception 'Invalid request key' using errcode = '22023';
  end if;

  select
    coalesce(s.plan, w.plan, 'free'),
    s.status,
    s.current_period_end
  into v_plan, v_status, v_period_end
  from public.workspaces w
  left join public.subscriptions s on s.workspace_id = w.id
  where w.id = p_workspace_id
    and public.is_workspace_member(w.id)
  for update of w;

  if not found then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if v_status is not null
    and not (
      v_status in ('active', 'trialing')
      or (v_status in ('past_due', 'canceled') and v_period_end > now())
    ) then
    v_plan := 'free';
  end if;

  v_plan := lower(v_plan);
  if v_plan not in ('free', 'pro', 'business') then
    v_plan := 'free';
  end if;

  if p_bucket = 'ai' then
    v_limit := case v_plan when 'pro' then 500 when 'business' then 5000 else 10 end;
  else
    v_limit := case v_plan when 'pro' then 200 when 'business' then 2000 else 5 end;
  end if;

  insert into public.usage (workspace_id, month, ai_requests, exports_count, updated_at)
  values (p_workspace_id, p_month, 0, 0, now())
  on conflict (workspace_id, month) do nothing;

  select
    case p_bucket when 'ai' then u.ai_requests else u.exports_count end
  into v_current
  from public.usage u
  where u.workspace_id = p_workspace_id
    and u.month = p_month
  for update;

  if exists (
    select 1
    from public.usage_events ue
    where ue.workspace_id = p_workspace_id
      and ue.month = p_month
      and ue.bucket = p_bucket
      and ue.request_key = p_request_key
  ) then
    return query select true, v_current, v_limit, v_plan, true;
    return;
  end if;

  if v_current >= v_limit then
    return query select false, v_current, v_limit, v_plan, false;
    return;
  end if;

  insert into public.usage_events (workspace_id, month, bucket, request_key)
  values (p_workspace_id, p_month, p_bucket, p_request_key);

  if p_bucket = 'ai' then
    update public.usage
    set ai_requests = ai_requests + 1, updated_at = now()
    where workspace_id = p_workspace_id and month = p_month
    returning ai_requests into v_current;
  else
    update public.usage
    set exports_count = exports_count + 1, updated_at = now()
    where workspace_id = p_workspace_id and month = p_month
    returning exports_count into v_current;
  end if;

  return query select true, v_current, v_limit, v_plan, false;
end;
$$;

revoke all on function public.consume_workspace_usage(uuid, text, text, text) from public, anon;
grant execute on function public.consume_workspace_usage(uuid, text, text, text) to authenticated;

create or replace function public.workspace_plan_tier(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when s.workspace_id is not null
      and (
        s.status in ('active', 'trialing')
        or (s.status in ('past_due', 'canceled') and s.current_period_end > now())
      )
      and lower(coalesce(s.plan, 'free')) in ('pro', 'business')
      then lower(s.plan)
    when s.workspace_id is null
      and lower(coalesce(w.plan, 'free')) in ('pro', 'business')
      then lower(w.plan)
    else 'free'
  end
  from public.workspaces w
  left join public.subscriptions s on s.workspace_id = w.id
  where w.id = p_workspace_id;
$$;

revoke all on function public.workspace_plan_tier(uuid) from public, anon, authenticated;

create or replace function public.enforce_workspace_lead_capacity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_plan text;
  v_count integer;
begin
  if new.workspace_id is null
    or new.deleted_at is not null
    or new.status not in ('new', 'contacted', 'proposal') then
    return new;
  end if;

  perform 1
  from public.workspaces w
  where w.id = new.workspace_id
  for update;

  if not found then
    raise exception 'Workspace not found' using errcode = '23503';
  end if;

  v_plan := public.workspace_plan_tier(new.workspace_id);
  if v_plan <> 'free' then
    return new;
  end if;

  select count(*)::integer
  into v_count
  from public.leads l
  where l.workspace_id = new.workspace_id
    and l.deleted_at is null
    and l.status in ('new', 'contacted', 'proposal')
    and (tg_op = 'INSERT' or l.id <> new.id);

  if v_count >= 50 then
    raise exception 'Lead limit reached for FREE plan (50/50)'
      using errcode = '23514', constraint = 'workspace_active_lead_capacity';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_workspace_lead_capacity on public.leads;
create trigger enforce_workspace_lead_capacity
before insert or update of workspace_id, status, deleted_at
on public.leads
for each row execute function public.enforce_workspace_lead_capacity();

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

  -- Only owners and admins may invite privileged roles.
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

create or replace function public.accept_workspace_invite_with_limit(p_token text)
returns table (workspace_id uuid, already_member boolean)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_invite public.workspace_invites%rowtype;
  v_email text;
  v_plan text;
  v_limit integer;
  v_seats integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_token is null
     or length(p_token) = 0
     or length(p_token) > 512 then
    raise exception 'Invalid invitation token'
      using errcode = '22023';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

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

  if v_email = ''
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

    return query
      select v_invite.workspace_id, true;
    return;
  end if;

  v_plan := public.workspace_plan_tier(v_invite.workspace_id);
  v_limit := case v_plan when 'pro' then 5 when 'business' then 20 else 1 end;

  select
    (select count(*)
     from public.workspace_members as wm
     where wm.workspace_id = v_invite.workspace_id)
    +
    (select count(*)
     from public.workspace_invites as wi
     where wi.workspace_id = v_invite.workspace_id
       and wi.accepted_at is null
       and (
         wi.expires_at is null
         or wi.expires_at > pg_catalog.now()
       ))
  into v_seats;

  -- The current invitation is included in the active pending-invite count.
  if v_seats > v_limit then
    raise exception 'Team seat limit reached for % plan (%/%)',
      pg_catalog.upper(v_plan), v_seats, v_limit
      using errcode = '23514',
            constraint = 'workspace_team_seat_capacity';
  end if;

  insert into public.workspace_members (
    workspace_id, user_id, role
  )
  values (
    v_invite.workspace_id, auth.uid(), v_invite.role
  );

  delete from public.workspace_invites as wi
  where wi.id = v_invite.id;

  return query
    select v_invite.workspace_id, false;
end;
$$;

revoke all on function public.accept_workspace_invite_with_limit(text) from public, anon;
grant execute on function public.accept_workspace_invite_with_limit(text) to authenticated;
