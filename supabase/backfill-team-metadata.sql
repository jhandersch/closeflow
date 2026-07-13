-- CloseFlow backfill: migrate legacy user_metadata.team_workspace into DB-first team tables
-- Run this in Supabase SQL Editor AFTER team schema migration is present.
-- Safe to run multiple times.

begin;

-- 1) Create organizations for users that still have legacy team_workspace metadata.
with legacy_workspace as (
  select
    u.id as owner_user_id,
    lower(trim(coalesce(u.email, ''))) as owner_email,
    u.raw_user_meta_data as metadata,
    coalesce(
      nullif(trim(u.raw_user_meta_data->'team_workspace'->>'organization_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'company_name'), ''),
      'My Organization'
    ) as organization_name,
    coalesce(
      nullif(trim(u.raw_user_meta_data->'team_workspace'->>'organization_slug'), ''),
      regexp_replace(
        lower(coalesce(nullif(trim(u.raw_user_meta_data->'team_workspace'->>'organization_name'), ''), 'my-organization')),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    ) as desired_slug
  from auth.users u
  where jsonb_typeof(u.raw_user_meta_data->'team_workspace') = 'object'
), org_rows as (
  select
    lw.owner_user_id,
    lw.organization_name,
    case
      when lw.desired_slug is null or lw.desired_slug = '' then ('org-' || substr(lw.owner_user_id::text, 1, 8))
      else regexp_replace(lw.desired_slug, '(^-+|-+$)', '', 'g')
    end as base_slug
  from legacy_workspace lw
)
insert into public.organizations (
  name,
  slug,
  owner_user_id,
  created_at,
  updated_at
)
select
  o.organization_name,
  case
    when o.base_slug = '' then ('org-' || substr(o.owner_user_id::text, 1, 8))
    else o.base_slug || '-' || substr(o.owner_user_id::text, 1, 8)
  end as slug,
  o.owner_user_id,
  now(),
  now()
from org_rows o
where not exists (
  select 1
  from public.organizations org
  where org.owner_user_id = o.owner_user_id
);

-- 2) Ensure each owner is a member with Owner role.
insert into public.organization_members (
  organization_id,
  member_user_id,
  member_email,
  member_name,
  role,
  status,
  created_at
)
select
  org.id,
  u.id,
  lower(trim(coalesce(u.email, 'unknown@example.com'))),
  nullif(trim(u.raw_user_meta_data->>'name'), ''),
  'Owner',
  'active',
  now()
from auth.users u
join public.organizations org
  on org.owner_user_id = u.id
where jsonb_typeof(u.raw_user_meta_data->'team_workspace') = 'object'
on conflict (organization_id, member_email)
do update set
  member_user_id = excluded.member_user_id,
  member_name = coalesce(excluded.member_name, public.organization_members.member_name),
  role = 'Owner',
  status = 'active';

-- 3) Backfill legacy members[] from metadata.
with workspace_members as (
  select
    org.id as organization_id,
    u.id as owner_user_id,
    m.value as member_json
  from auth.users u
  join public.organizations org
    on org.owner_user_id = u.id
  cross join lateral jsonb_array_elements(coalesce(u.raw_user_meta_data->'team_workspace'->'members', '[]'::jsonb)) as m(value)
  where jsonb_typeof(u.raw_user_meta_data->'team_workspace') = 'object'
), normalized_members as (
  select
    wm.organization_id,
    case
      when (wm.member_json->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (wm.member_json->>'id')::uuid
      else null
    end as member_user_id,
    lower(trim(coalesce(nullif(wm.member_json->>'email', ''), 'unknown@example.com'))) as member_email,
    nullif(trim(coalesce(wm.member_json->>'name', '')), '') as member_name,
    case
      when wm.member_json->>'role' in ('Owner', 'Admin', 'Sales', 'Viewer') then wm.member_json->>'role'
      else 'Sales'
    end as role,
    case
      when wm.member_json->>'status' in ('active', 'invited') then wm.member_json->>'status'
      else 'active'
    end as status
  from workspace_members wm
)
insert into public.organization_members (
  organization_id,
  member_user_id,
  member_email,
  member_name,
  role,
  status,
  created_at
)
select
  nm.organization_id,
  nm.member_user_id,
  nm.member_email,
  nm.member_name,
  nm.role,
  nm.status,
  now()
from normalized_members nm
on conflict (organization_id, member_email)
do update set
  member_user_id = coalesce(excluded.member_user_id, public.organization_members.member_user_id),
  member_name = coalesce(excluded.member_name, public.organization_members.member_name),
  role = excluded.role,
  status = excluded.status;

-- 4) Backfill legacy invites[] from metadata.
with workspace_invites as (
  select
    org.id as organization_id,
    u.id as owner_user_id,
    i.value as invite_json
  from auth.users u
  join public.organizations org
    on org.owner_user_id = u.id
  cross join lateral jsonb_array_elements(coalesce(u.raw_user_meta_data->'team_workspace'->'invites', '[]'::jsonb)) as i(value)
  where jsonb_typeof(u.raw_user_meta_data->'team_workspace') = 'object'
), normalized_invites as (
  select
    wi.organization_id,
    wi.owner_user_id as invited_by,
    lower(trim(coalesce(nullif(wi.invite_json->>'email', ''), ''))) as email,
    case
      when wi.invite_json->>'role' in ('Owner', 'Admin', 'Sales', 'Viewer') then wi.invite_json->>'role'
      else 'Sales'
    end as role,
    case
      when wi.invite_json->>'status' in ('pending', 'accepted', 'expired', 'revoked') then wi.invite_json->>'status'
      else 'pending'
    end as status,
    case
      when nullif(trim(coalesce(wi.invite_json->>'created_at', '')), '') is not null
        then (wi.invite_json->>'created_at')::timestamptz
      else now()
    end as created_at
  from workspace_invites wi
)
insert into public.organization_invites (
  organization_id,
  email,
  role,
  status,
  invited_by,
  created_at,
  updated_at
)
select
  ni.organization_id,
  ni.email,
  ni.role,
  ni.status,
  ni.invited_by,
  ni.created_at,
  now()
from normalized_invites ni
where ni.email <> ''
on conflict (organization_id, email)
do update set
  role = excluded.role,
  status = excluded.status,
  invited_by = excluded.invited_by,
  updated_at = now();

-- 5) Optional audit marker per organization.
insert into public.organization_audit_events (
  organization_id,
  actor_user_id,
  event_type,
  event_payload,
  created_at
)
select
  org.id,
  org.owner_user_id,
  'invite_refreshed',
  jsonb_build_object(
    'source', 'metadata_backfill',
    'note', 'Legacy team_workspace metadata migrated to relational tables'
  ),
  now()
from public.organizations org
where not exists (
  select 1
  from public.organization_audit_events e
  where e.organization_id = org.id
    and e.event_payload->>'source' = 'metadata_backfill'
);

commit;
