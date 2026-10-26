-- Compact workspace schema health check: one result set, only problems plus a summary row.
-- Run in Supabase SQL Editor. Read-only.
with
tables_expected(name) as (
  values ('profiles'),('workspaces'),('workspace_members'),('workspace_invites'),('teams'),('team_members'),
    ('leads'),('lead_tags'),('lead_tag_links'),('customers'),('tasks'),('activities'),('calendar_events'),
    ('ai_conversations'),('lead_scores'),('lead_memory'),('revenue_events'),('usage'),('subscriptions'),
    ('notifications'),('automations'),('automation_runs'),('audit_logs'),('mfa_recovery_codes')
),
rls_expected(name) as (
  values ('profiles'),('workspaces'),('workspace_members'),('workspace_invites'),('teams'),('team_members'),
    ('leads'),('customers'),('tasks'),('activities'),('calendar_events'),('ai_conversations'),('lead_scores'),
    ('lead_memory'),('revenue_events'),('usage'),('subscriptions'),('notifications'),('automations'),
    ('automation_runs'),('audit_logs'),('mfa_recovery_codes')
),
columns_expected(t, c) as (
  values ('workspaces','owner_id'),('workspaces','plan'),('workspace_members','role'),
    ('workspace_invites','token'),('workspace_invites','expires_at'),('workspace_invites','accepted_at'),
    ('leads','workspace_id'),('leads','created_by'),('leads','deleted_at'),('customers','lead_id'),
    ('tasks','workspace_id'),('tasks','deleted_at'),('activities','workspace_id'),
    ('calendar_events','scheduled_at'),('calendar_events','deleted_at'),('usage','ai_requests'),
    ('usage','exports_count'),('subscriptions','stripe_customer_id'),('subscriptions','stripe_subscription_id'),
    ('automations','workspace_id'),('automation_runs','workspace_id'),('audit_logs','workspace_id')
),
functions_expected(name) as (
  values ('is_workspace_member'),('is_workspace_manager'),('can_access_workspace_file_folder'),
    ('soft_delete_lead_dependents'),('restore_lead_dependents'),('soft_delete_task'),
    ('soft_delete_lead_tasks'),('restore_lead_tasks')
),
policies_expected(t, p) as (
  values ('profiles','profiles_self_select'),('workspaces','workspaces_member_select'),
    ('workspaces','workspaces_manager_update'),('workspace_members','workspace_members_member_select'),
    ('workspace_members','workspace_members_manager_insert'),('workspace_members','workspace_members_manager_update'),
    ('workspace_members','workspace_members_manager_delete'),('workspace_invites','workspace_invites_member_select'),
    ('workspace_invites','workspace_invites_manager_insert'),('leads','leads_workspace_member_select'),
    ('leads','leads_workspace_member_insert'),('leads','leads_workspace_member_update'),
    ('leads','leads_workspace_member_delete'),('customers','customers_member_select'),
    ('customers','customers_member_insert'),('customers','customers_member_update'),('customers','customers_member_delete'),
    ('tasks','tasks_workspace_member_select'),('tasks','tasks_workspace_member_insert'),
    ('tasks','tasks_workspace_member_update'),('tasks','tasks_workspace_member_delete'),
    ('activities','activities_workspace_member_select'),('activities','activities_workspace_member_insert'),
    ('activities','activities_workspace_member_update'),('activities','activities_workspace_member_delete'),
    ('calendar_events','calendar_events_member_select'),
    ('ai_conversations','ai_conversations_member_select'),('ai_conversations','ai_conversations_member_insert'),
    ('ai_conversations','ai_conversations_member_update'),('ai_conversations','ai_conversations_member_delete'),
    ('revenue_events','revenue_events_member_select'),('revenue_events','revenue_events_member_insert'),
    ('revenue_events','revenue_events_member_update'),('revenue_events','revenue_events_member_delete'),
    ('usage','usage_member_select'),('usage','usage_member_insert'),('usage','usage_member_update'),('usage','usage_member_delete'),
    ('subscriptions','subscriptions_member_select'),('automations','automations_member_select'),
    ('audit_logs','audit_logs_member_select'),('mfa_recovery_codes','mfa_recovery_codes_self_select')
),
problems as (
  select 'table missing' as kind, e.name as item
    from tables_expected e left join pg_tables t on t.schemaname = 'public' and t.tablename = e.name
    where t.tablename is null
  union all
  select 'rls disabled', e.name
    from rls_expected e
    left join pg_class c on c.relname = e.name and c.relnamespace = 'public'::regnamespace
    where coalesce(c.relrowsecurity, false) = false
  union all
  select 'column missing', e.t || '.' || e.c
    from columns_expected e
    left join information_schema.columns c
      on c.table_schema = 'public' and c.table_name = e.t and c.column_name = e.c
    where c.column_name is null
  union all
  select 'function missing', e.name
    from functions_expected e
    left join pg_proc p on p.proname = e.name and p.pronamespace = 'public'::regnamespace
    where p.proname is null
  union all
  select 'policy missing', e.t || '.' || e.p
    from policies_expected e
    left join pg_policies p on p.schemaname = 'public' and p.tablename = e.t and p.policyname = e.p
    where p.policyname is null
  union all
  select 'bucket not private', 'closeflow-files'
    where not exists (select 1 from storage.buckets where id = 'closeflow-files' and public = false)
  union all
  select 'storage policy missing', e.name
    from (values ('closeflow_files_workspace_read'),('closeflow_files_workspace_insert'),('closeflow_files_workspace_delete')) e(name)
    left join pg_policies p on p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = e.name
    where p.policyname is null
)
select kind, item from problems
union all
select 'SUMMARY', (select count(*) from problems)::text || ' problems'
order by 1, 2;
