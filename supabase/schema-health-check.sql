-- CloseFlow schema health check
-- Run in Supabase SQL Editor.
-- The script reports missing tables, missing columns, missing functions, missing policies,
-- and RLS status for team tables.

-- 1) Required tables
with expected_tables(table_name) as (
  values
    ('leads'),
    ('activities'),
    ('tasks'),
    ('organizations'),
    ('organization_members'),
    ('organization_invites'),
    ('organization_audit_events')
)
select
  e.table_name,
  case when t.tablename is null then 'missing' else 'ok' end as status
from expected_tables e
left join pg_tables t
  on t.schemaname = 'public'
 and t.tablename = e.table_name
order by e.table_name;

-- 2) Required columns (core + team)
with expected_columns(table_name, column_name) as (
  values
    ('leads', 'id'),
    ('leads', 'user_id'),
    ('leads', 'name'),
    ('leads', 'company'),
    ('leads', 'status'),
    ('leads', 'value'),
    ('leads', 'notes'),
    ('leads', 'created_at'),
    ('leads', 'updated_at'),
    ('leads', 'stage_changed_at'),
    ('leads', 'last_activity_at'),
    ('leads', 'source'),
    ('leads', 'tags'),
    ('leads', 'email'),
    ('leads', 'phone'),
    ('leads', 'address'),
    ('leads', 'website'),
    ('leads', 'next_action'),
    ('leads', 'next_action_date'),
    ('leads', 'deleted_at'),

    ('activities', 'id'),
    ('activities', 'lead_id'),
    ('activities', 'user_id'),
    ('activities', 'action'),
    ('activities', 'type'),
    ('activities', 'created_at'),

    ('tasks', 'id'),
    ('tasks', 'lead_id'),
    ('tasks', 'user_id'),
    ('tasks', 'title'),
    ('tasks', 'completed'),
    ('tasks', 'priority'),
    ('tasks', 'due_date'),
    ('tasks', 'created_at'),

    ('organizations', 'id'),
    ('organizations', 'name'),
    ('organizations', 'slug'),
    ('organizations', 'owner_user_id'),
    ('organizations', 'created_at'),
    ('organizations', 'updated_at'),

    ('organization_members', 'id'),
    ('organization_members', 'organization_id'),
    ('organization_members', 'member_user_id'),
    ('organization_members', 'member_email'),
    ('organization_members', 'member_name'),
    ('organization_members', 'role'),
    ('organization_members', 'status'),
    ('organization_members', 'created_at'),

    ('organization_invites', 'id'),
    ('organization_invites', 'organization_id'),
    ('organization_invites', 'email'),
    ('organization_invites', 'token_hash'),
    ('organization_invites', 'role'),
    ('organization_invites', 'status'),
    ('organization_invites', 'invited_by'),
    ('organization_invites', 'expires_at'),
    ('organization_invites', 'accepted_at'),
    ('organization_invites', 'created_at'),
    ('organization_invites', 'updated_at'),

    ('organization_audit_events', 'id'),
    ('organization_audit_events', 'organization_id'),
    ('organization_audit_events', 'actor_user_id'),
    ('organization_audit_events', 'event_type'),
    ('organization_audit_events', 'event_payload'),
    ('organization_audit_events', 'created_at')
)
select
  e.table_name,
  e.column_name,
  case when c.column_name is null then 'missing' else 'ok' end as status
from expected_columns e
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = e.table_name
 and c.column_name = e.column_name
order by e.table_name, e.column_name;

-- 3) Required RPC functions
with expected_functions(function_name) as (
  values
    ('create_organization_invite'),
    ('accept_organization_invite')
)
select
  e.function_name,
  case when p.proname is null then 'missing' else 'ok' end as status
from expected_functions e
left join pg_proc p
  on p.proname = e.function_name
left join pg_namespace n
  on n.oid = p.pronamespace
 and n.nspname = 'public'
order by e.function_name;

-- 4) Required RLS policies (core + team)
with expected_policies(table_name, policy_name) as (
  values
    ('leads', 'leads_select_own'),
    ('leads', 'leads_insert_own'),
    ('leads', 'leads_update_own'),
    ('leads', 'leads_delete_own'),

    ('activities', 'activities_select_by_lead_owner'),
    ('activities', 'activities_insert_by_lead_owner'),

    ('tasks', 'tasks_select_by_lead_owner'),
    ('tasks', 'tasks_insert_by_lead_owner'),
    ('tasks', 'tasks_update_by_lead_owner'),
    ('tasks', 'tasks_delete_by_lead_owner'),

    ('organizations', 'organizations_select_for_members'),
    ('organizations', 'organizations_insert_owner'),
    ('organizations', 'organizations_update_owner_or_admin'),

    ('organization_members', 'members_select_for_active_members'),
    ('organization_members', 'members_insert_for_owner_or_admin'),
    ('organization_members', 'members_update_for_owner_or_admin'),

    ('organization_invites', 'invites_select_for_active_members'),
    ('organization_invites', 'invites_select_for_invited_email'),
    ('organization_invites', 'invites_insert_for_owner_or_admin'),
    ('organization_invites', 'invites_update_for_owner_or_admin'),
    ('organization_invites', 'invites_delete_for_owner_or_admin'),

    ('organization_audit_events', 'organization_audit_events_select_for_active_members')
)
select
  e.table_name,
  e.policy_name,
  case when p.policyname is null then 'missing' else 'ok' end as status
from expected_policies e
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = e.table_name
 and p.policyname = e.policy_name
order by e.table_name, e.policy_name;

-- 5) RLS enabled checks (core + team)
with expected_rls(table_name) as (
  values
    ('leads'),
    ('activities'),
    ('tasks'),
    ('organizations'),
    ('organization_members'),
    ('organization_invites'),
    ('organization_audit_events')
)
select
  e.table_name,
  case when c.relrowsecurity then 'enabled' else 'disabled_or_missing' end as rls_status
from expected_rls e
left join pg_class c
  on c.relname = e.table_name
left join pg_namespace n
  on n.oid = c.relnamespace
 and n.nspname = 'public'
order by e.table_name;

-- 6) Required function execute grants for authenticated
with expected_function_grants(function_name) as (
  values
    ('create_organization_invite'),
    ('accept_organization_invite')
)
select
  e.function_name,
  case when g.routine_name is null then 'missing_grant' else 'ok' end as status
from expected_function_grants e
left join information_schema.role_routine_grants g
  on g.specific_schema = 'public'
 and g.routine_name = e.function_name
 and g.grantee = 'authenticated'
 and g.privilege_type = 'EXECUTE'
order by e.function_name;

-- 7) Compact summary
with
required_tables as (
  select count(*) as total from (values
    ('leads'), ('activities'), ('tasks'),
    ('organizations'), ('organization_members'), ('organization_invites'), ('organization_audit_events')
  ) t(table_name)
),
existing_tables as (
  select count(*) as present
  from pg_tables
  where schemaname = 'public'
    and tablename in (
      'leads', 'activities', 'tasks',
      'organizations', 'organization_members', 'organization_invites', 'organization_audit_events'
    )
)
select
  rt.total as required_tables,
  et.present as present_tables,
  (rt.total - et.present) as missing_tables
from required_tables rt
cross join existing_tables et;
