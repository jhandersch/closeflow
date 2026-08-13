-- CloseFlow schema repair/bootstrap template
-- Run this in Supabase SQL Editor after schema-health-check.sql.
-- Safe to run multiple times (idempotent where possible).

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Core CRM tables
-- -----------------------------------------------------------------------------

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  company text not null,
  status text not null default 'new',
  value numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists stage_changed_at timestamptz;
alter table public.leads add column if not exists last_activity_at timestamptz;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists tags text[];
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists website text;
alter table public.leads add column if not exists owner_id uuid;
alter table public.leads add column if not exists next_action text;
alter table public.leads add column if not exists next_action_date timestamptz;

create index if not exists idx_leads_user_id on public.leads(user_id);
create index if not exists idx_leads_status on public.leads(status);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  user_id uuid not null,
  workspace_id uuid,
  action text not null,
  type text not null default 'other',
  title text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_lead_id on public.activities(lead_id);
create index if not exists idx_activities_created_at on public.activities(created_at desc);
create index if not exists idx_activities_workspace_id on public.activities(workspace_id);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid not null,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_workspace_scheduled on public.calendar_events(workspace_id, scheduled_at);
create index if not exists idx_calendar_events_user_scheduled on public.calendar_events(user_id, scheduled_at);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  completed boolean not null default false,
  priority text not null default 'medium',
  due_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_lead_id on public.tasks(lead_id);
create index if not exists idx_tasks_user_id on public.tasks(user_id);

-- -----------------------------------------------------------------------------
-- Team workspace tables
-- -----------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_user_id uuid,
  member_email text not null,
  member_name text,
  role text not null check (role in ('Owner', 'Admin', 'Sales Manager', 'Sales', 'Sales Rep', 'Viewer')),
  status text not null default 'active' check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  unique (organization_id, member_email)
);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  token_hash text,
  role text not null check (role in ('Owner', 'Admin', 'Sales Manager', 'Sales', 'Sales Rep', 'Viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid not null,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.organization_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null,
  event_type text not null check (event_type in ('invite_created', 'invite_refreshed', 'invite_accepted')),
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_organization_members_org_id on public.organization_members(organization_id);
create index if not exists idx_organization_members_member_user_id on public.organization_members(member_user_id);
create index if not exists idx_organization_invites_org_id on public.organization_invites(organization_id);
create index if not exists idx_organization_invites_email on public.organization_invites(email);
create index if not exists idx_organization_audit_events_org_id on public.organization_audit_events(organization_id);
create index if not exists idx_organization_audit_events_created_at on public.organization_audit_events(created_at desc);
create unique index if not exists idx_organization_invites_token_hash_unique
  on public.organization_invites(token_hash)
  where token_hash is not null;
create unique index if not exists idx_organization_members_org_lower_email_unique
  on public.organization_members(organization_id, lower(member_email));
create unique index if not exists idx_organization_invites_org_lower_email_unique
  on public.organization_invites(organization_id, lower(email));

update public.organization_members
set member_email = lower(member_email)
where member_email <> lower(member_email);

update public.organization_invites
set email = lower(email)
where email <> lower(email);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_role_check'
  ) then
    alter table public.organization_members drop constraint organization_members_role_check;
  end if;

  alter table public.organization_members
    add constraint organization_members_role_check
    check (role in ('Owner', 'Admin', 'Sales Manager', 'Sales', 'Sales Rep', 'Viewer'));

  if exists (
    select 1
    from pg_constraint
    where conname = 'organization_invites_role_check'
  ) then
    alter table public.organization_invites drop constraint organization_invites_role_check;
  end if;

  alter table public.organization_invites
    add constraint organization_invites_role_check
    check (role in ('Owner', 'Admin', 'Sales Manager', 'Sales', 'Sales Rep', 'Viewer'));

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_member_email_lowercase'
  ) then
    alter table public.organization_members
      add constraint organization_members_member_email_lowercase
      check (member_email = lower(member_email));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_invites_email_lowercase'
  ) then
    alter table public.organization_invites
      add constraint organization_invites_email_lowercase
      check (email = lower(email));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Team RLS + policies
-- -----------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.organization_audit_events enable row level security;

drop policy if exists organizations_select_for_members on public.organizations;
create policy organizations_select_for_members on public.organizations
for select
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organizations.id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists organizations_insert_owner on public.organizations;
create policy organizations_insert_owner on public.organizations
for insert
with check (owner_user_id = auth.uid());

drop policy if exists organizations_update_owner_or_admin on public.organizations;
create policy organizations_update_owner_or_admin on public.organizations
for update
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organizations.id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organizations.id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
);

drop policy if exists members_select_for_active_members on public.organization_members;
create policy members_select_for_active_members on public.organization_members
for select
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists members_insert_for_owner_or_admin on public.organization_members;
create policy members_insert_for_owner_or_admin on public.organization_members
for insert
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
);

drop policy if exists members_update_for_owner_or_admin on public.organization_members;
create policy members_update_for_owner_or_admin on public.organization_members
for update
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
);

drop policy if exists invites_select_for_active_members on public.organization_invites;
create policy invites_select_for_active_members on public.organization_invites
for select
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_invites.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists invites_select_for_invited_email on public.organization_invites;
create policy invites_select_for_invited_email on public.organization_invites
for select
using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

drop policy if exists invites_insert_for_owner_or_admin on public.organization_invites;
create policy invites_insert_for_owner_or_admin on public.organization_invites
for insert
with check (
  invited_by = auth.uid() and
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_invites.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
);

drop policy if exists invites_update_for_owner_or_admin on public.organization_invites;
create policy invites_update_for_owner_or_admin on public.organization_invites
for update
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_invites.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_invites.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
);

drop policy if exists invites_delete_for_owner_or_admin on public.organization_invites;
create policy invites_delete_for_owner_or_admin on public.organization_invites
for delete
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_invites.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  )
);

drop policy if exists organization_audit_events_select_for_active_members on public.organization_audit_events;
create policy organization_audit_events_select_for_active_members on public.organization_audit_events
for select
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organization_audit_events.organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
  )
);

-- -----------------------------------------------------------------------------
-- Team RPCs
-- -----------------------------------------------------------------------------

create or replace function public.create_organization_invite(
  p_organization_id uuid,
  p_email text,
  p_role text default 'Sales',
  p_expires_in_hours integer default 168
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_email text;
  v_role text;
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

  if v_email = '' then
    raise exception 'Invite email is required';
  end if;

  if v_role not in ('Owner', 'Admin', 'Sales Manager', 'Sales', 'Sales Rep', 'Viewer') then
    raise exception 'Invalid role';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.member_user_id = v_auth_user_id
      and m.status = 'active'
      and m.role in ('Owner', 'Admin')
  ) then
    raise exception 'Not authorized to invite members';
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
    now() + make_interval(hours => greatest(p_expires_in_hours, 1)),
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
      'expires_at', now() + make_interval(hours => greatest(p_expires_in_hours, 1))
    )
  );

  return v_token;
end;
$$;

create or replace function public.accept_organization_invite(
  p_invite_id uuid default null,
  p_email text default null,
  p_member_name text default null,
  p_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_auth_email text;
  v_token_hash text;
  v_invite record;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_auth_email := lower(coalesce(auth.jwt()->>'email', p_email, ''));

  if v_auth_email = '' then
    raise exception 'Missing invite email';
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
  limit 1;

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

grant execute on function public.create_organization_invite(uuid, text, text, integer) to authenticated;
grant execute on function public.accept_organization_invite(uuid, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Optional: baseline RLS for core tables (adjust to your preferred model)
-- -----------------------------------------------------------------------------

alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;

drop policy if exists leads_select_own on public.leads;
create policy leads_select_own on public.leads
for select
using (user_id = auth.uid());

drop policy if exists leads_insert_own on public.leads;
create policy leads_insert_own on public.leads
for insert
with check (user_id = auth.uid());

drop policy if exists leads_update_own on public.leads;
create policy leads_update_own on public.leads
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists leads_delete_own on public.leads;
create policy leads_delete_own on public.leads
for delete
using (user_id = auth.uid());

drop policy if exists activities_select_by_lead_owner on public.activities;
create policy activities_select_by_lead_owner on public.activities
for select
using (
  exists (
    select 1
    from public.leads l
    where l.id = activities.lead_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists activities_insert_by_lead_owner on public.activities;
create policy activities_insert_by_lead_owner on public.activities
for insert
with check (
  exists (
    select 1
    from public.leads l
    where l.id = activities.lead_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists tasks_select_by_lead_owner on public.tasks;
create policy tasks_select_by_lead_owner on public.tasks
for select
using (
  exists (
    select 1
    from public.leads l
    where l.id = tasks.lead_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists tasks_insert_by_lead_owner on public.tasks;
create policy tasks_insert_by_lead_owner on public.tasks
for insert
with check (
  exists (
    select 1
    from public.leads l
    where l.id = tasks.lead_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists tasks_update_by_lead_owner on public.tasks;
create policy tasks_update_by_lead_owner on public.tasks
for update
using (
  exists (
    select 1
    from public.leads l
    where l.id = tasks.lead_id
      and l.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.leads l
    where l.id = tasks.lead_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists tasks_delete_by_lead_owner on public.tasks;
create policy tasks_delete_by_lead_owner on public.tasks
for delete
using (
  exists (
    select 1
    from public.leads l
    where l.id = tasks.lead_id
      and l.user_id = auth.uid()
  )
);
