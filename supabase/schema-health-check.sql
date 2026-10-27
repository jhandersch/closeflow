-- CloseFlow schema health check
-- Run in Supabase SQL Editor.
-- The workspace checks below reflect the current application schema. The older
-- organization checks that follow are retained only as legacy compatibility checks.

-- Current workspace-first schema: required tables
with expected_tables(table_name) as (
  values
    ('profiles'),
    ('workspaces'),
    ('workspace_members'),
    ('workspace_invites'),
    ('teams'),
    ('team_members'),
    ('leads'),
    ('lead_tags'),
    ('lead_tag_links'),
    ('customers'),
    ('tasks'),
    ('activities'),
    ('calendar_events'),
    ('ai_conversations'),
    ('lead_scores'),
    ('lead_memory'),
    ('revenue_events'),
    ('usage'),
    ('subscriptions'),
    ('notifications'),
    ('automations'),
    ('automation_runs'),
    ('audit_logs'),
    ('mfa_recovery_codes')
)
select
  e.table_name,
  case when t.tablename is null then 'missing' else 'ok' end as status
from expected_tables e
left join pg_tables t
  on t.schemaname = 'public'
 and t.tablename = e.table_name
order by e.table_name;

-- Current workspace-first schema: columns used by workspace and CRM routes
with expected_columns(table_name, column_name) as (
  values
    ('profiles', 'id'),
    ('workspaces', 'id'),
    ('workspaces', 'name'),
    ('workspaces', 'owner_id'),
    ('workspaces', 'plan'),
    ('workspace_members', 'workspace_id'),
    ('workspace_members', 'user_id'),
    ('workspace_members', 'role'),
    ('workspace_invites', 'workspace_id'),
    ('workspace_invites', 'email'),
    ('workspace_invites', 'token'),
    ('workspace_invites', 'expires_at'),
    ('workspace_invites', 'accepted_at'),
    ('leads', 'id'),
    ('leads', 'workspace_id'),
    ('leads', 'user_id'),
    ('leads', 'created_by'),
    ('leads', 'name'),
    ('leads', 'status'),
    ('leads', 'deleted_at'),
    ('customers', 'id'),
    ('customers', 'workspace_id'),
    ('customers', 'lead_id'),
    ('customers', 'company'),
    ('tasks', 'id'),
    ('tasks', 'workspace_id'),
    ('tasks', 'lead_id'),
    ('tasks', 'user_id'),
    ('tasks', 'title'),
    ('tasks', 'completed'),
    ('tasks', 'due_date'),
    ('tasks', 'deleted_at'),
    ('activities', 'id'),
    ('activities', 'workspace_id'),
    ('activities', 'lead_id'),
    ('activities', 'user_id'),
    ('activities', 'action'),
    ('calendar_events', 'id'),
    ('calendar_events', 'workspace_id'),
    ('calendar_events', 'lead_id'),
    ('calendar_events', 'user_id'),
    ('calendar_events', 'scheduled_at'),
    ('calendar_events', 'deleted_at'),
    ('usage', 'workspace_id'),
    ('usage', 'month'),
    ('usage', 'ai_requests'),
    ('usage', 'exports_count'),
    ('subscriptions', 'workspace_id'),
    ('subscriptions', 'plan'),
    ('subscriptions', 'status'),
    ('subscriptions', 'stripe_customer_id'),
    ('subscriptions', 'stripe_subscription_id'),
    ('automations', 'workspace_id'),
    ('automation_runs', 'workspace_id'),
    ('audit_logs', 'workspace_id')
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

-- Current workspace-first schema: RLS must be enabled on every tenant table
with expected_rls(table_name) as (
  values
    ('profiles'),
    ('workspaces'),
    ('workspace_members'),
    ('workspace_invites'),
    ('teams'),
    ('team_members'),
    ('leads'),
    ('customers'),
    ('tasks'),
    ('activities'),
    ('calendar_events'),
    ('ai_conversations'),
    ('lead_scores'),
    ('lead_memory'),
    ('revenue_events'),
    ('usage'),
    ('subscriptions'),
    ('notifications'),
    ('automations'),
    ('automation_runs'),
    ('audit_logs'),
    ('mfa_recovery_codes')
)
select
  e.table_name,
  case when c.relrowsecurity then 'enabled' else 'disabled_or_missing' end as rls_status
from expected_rls e
left join pg_namespace n
  on n.nspname = 'public'
left join pg_class c
  on c.relname = e.table_name
 and c.relnamespace = n.oid
order by e.table_name;

-- Current workspace-first schema: critical membership and data access policies
with expected_policies(table_name, policy_name) as (
  values
    ('profiles', 'profiles_self_select'),
    ('profiles', 'profiles_self_insert'),
    ('profiles', 'profiles_self_update'),
    ('workspaces', 'workspaces_member_select'),
    ('workspaces', 'workspaces_owner_insert'),
    ('workspaces', 'workspaces_manager_update'),
    ('workspace_members', 'workspace_members_member_select'),
    ('workspace_members', 'workspace_members_manager_insert'),
    ('workspace_members', 'workspace_members_manager_update'),
    ('workspace_members', 'workspace_members_manager_delete'),
    ('workspace_invites', 'workspace_invites_member_select'),
    ('workspace_invites', 'workspace_invites_manager_insert'),
    ('workspace_invites', 'workspace_invites_manager_update'),
    ('workspace_invites', 'workspace_invites_manager_delete'),
    ('leads', 'leads_workspace_member_select'),
    ('leads', 'leads_workspace_member_insert'),
    ('leads', 'leads_workspace_member_update'),
    ('leads', 'leads_workspace_member_delete'),
    ('customers', 'customers_member_select'),
    ('customers', 'customers_member_insert'),
    ('customers', 'customers_member_update'),
    ('customers', 'customers_member_delete'),
    ('tasks', 'tasks_workspace_member_select'),
    ('tasks', 'tasks_workspace_member_insert'),
    ('tasks', 'tasks_workspace_member_update'),
    ('tasks', 'tasks_workspace_member_delete'),
    ('activities', 'activities_workspace_member_select'),
    ('activities', 'activities_workspace_member_insert'),
    ('activities', 'activities_workspace_member_update'),
    ('activities', 'activities_workspace_member_delete'),
    ('calendar_events', 'calendar_events_member_select'),
    ('calendar_events', 'calendar_events_member_insert'),
    ('calendar_events', 'calendar_events_member_update'),
    ('calendar_events', 'calendar_events_member_delete'),
    ('ai_conversations', 'ai_conversations_member_select'),
    ('ai_conversations', 'ai_conversations_member_insert'),
    ('ai_conversations', 'ai_conversations_member_update'),
    ('ai_conversations', 'ai_conversations_member_delete'),
    ('revenue_events', 'revenue_events_member_select'),
    ('revenue_events', 'revenue_events_member_insert'),
    ('revenue_events', 'revenue_events_member_update'),
    ('revenue_events', 'revenue_events_member_delete'),
    ('usage', 'usage_member_select'),
    ('usage', 'usage_member_insert'),
    ('usage', 'usage_member_update'),
    ('usage', 'usage_member_delete'),
    ('subscriptions', 'subscriptions_member_select'),
    ('subscriptions', 'subscriptions_manager_mutation'),
    ('automations', 'automations_member_select'),
    ('automations', 'automations_manager_mutation'),
    ('automation_runs', 'automation_runs_member_select'),
    ('audit_logs', 'audit_logs_member_select'),
    ('mfa_recovery_codes', 'mfa_recovery_codes_self_select'),
    ('mfa_recovery_codes', 'mfa_recovery_codes_self_insert'),
    ('mfa_recovery_codes', 'mfa_recovery_codes_self_update'),
    ('mfa_recovery_codes', 'mfa_recovery_codes_self_delete')
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

-- Current workspace-first schema: RPCs used in RLS, file access, and restore flows
with expected_functions(function_name) as (
  values
    ('is_workspace_member'),
    ('is_workspace_manager'),
    ('can_access_workspace_file_folder'),
    ('soft_delete_lead_dependents'),
    ('restore_lead_dependents'),
    ('soft_delete_task'),
    ('soft_delete_lead_tasks'),
    ('restore_lead_tasks'),
    ('prevent_duplicate_workspace_lead'),
    ('create_lead_with_duplicate_check')
)
select
  e.function_name,
  case when p.proname is null then 'missing' else 'ok' end as status
from expected_functions e
left join pg_proc p
  on p.proname = e.function_name
 and p.pronamespace = 'public'::regnamespace
order by e.function_name;

select
  'leads.prevent_duplicate_workspace_lead' as trigger_name,
  case when t.tgname is null then 'missing' else 'ok' end as status
from (values ('prevent_duplicate_workspace_lead')) expected(name)
left join pg_trigger t
  on t.tgname = expected.name
 and t.tgrelid = 'public.leads'::regclass
 and not t.tgisinternal;

-- Workspace file storage must remain private and membership-scoped.
select
  'closeflow-files' as bucket_id,
  case
    when b.id is null then 'missing'
    when b.public then 'public_bucket'
    else 'private'
  end as status
from (values ('closeflow-files')) expected(id)
left join storage.buckets b on b.id = expected.id;

select
  e.policyname,
  case when p.policyname is null then 'missing' else 'ok' end as status
from (values
  ('closeflow_files_workspace_read'),
  ('closeflow_files_workspace_insert'),
  ('closeflow_files_workspace_delete')
) e(policyname)
left join pg_policies p
  on p.schemaname = 'storage'
 and p.tablename = 'objects'
 and p.policyname = e.policyname
order by e.policyname;

-- Legacy organization compatibility diagnostics (not the canonical workspace model).
-- 1) Legacy tables
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

-- 7) Legacy organization summary
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
