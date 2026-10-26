-- Read-only verification of the organization RLS recursion fix.
with expected_policies(tablename, policyname, helper) as (
  values
    ('organizations', 'organizations_select_for_members', 'is_organization_member'),
    ('organizations', 'organizations_update_owner_or_admin', 'is_organization_manager'),
    ('organization_members', 'members_select_for_active_members', 'is_organization_member'),
    ('organization_members', 'members_insert_for_owner_or_admin', 'is_organization_manager'),
    ('organization_members', 'members_update_for_owner_or_admin', 'is_organization_manager'),
    ('organization_invites', 'invites_select_for_active_members', 'is_organization_member'),
    ('organization_invites', 'invites_insert_for_owner_or_admin', 'is_organization_manager'),
    ('organization_invites', 'invites_update_for_owner_or_admin', 'is_organization_manager'),
    ('organization_invites', 'invites_delete_for_owner_or_admin', 'is_organization_manager'),
    ('organization_audit_events', 'organization_audit_events_select_for_active_members', 'is_organization_member')
),
function_checks as (
  select
    p.proname as object_name,
    p.prosecdef as is_security_definer,
    coalesce(array_to_string(p.proconfig, ', '), '') as function_settings,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('is_organization_member', 'is_organization_manager')
    and pg_get_function_identity_arguments(p.oid) = 'p_organization_id uuid'
),
policy_checks as (
  select
    e.tablename || '.' || e.policyname as object_name,
    p.policyname is not null as exists_in_database,
    p.roles::text as policy_roles,
    coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') as policy_expression,
    e.helper
  from expected_policies e
  left join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = e.tablename
   and p.policyname = e.policyname
)
select
  'function' as item_type,
  object_name,
  case
    when is_security_definer
      and function_settings like '%search_path=public, pg_temp%'
      and anon_can_execute
      and authenticated_can_execute then 'ok'
    else 'CHECK'
  end as finding,
  'security_definer=' || is_security_definer
    || '; settings=' || function_settings
    || '; anon_execute=' || anon_can_execute
    || '; authenticated_execute=' || authenticated_can_execute as details
from function_checks
union all
select
  'policy' as item_type,
  object_name,
  case
    when exists_in_database
      and policy_expression like '%' || helper || '%' then 'ok'
    else 'CHECK'
  end as finding,
  'exists=' || exists_in_database
    || '; roles=' || coalesce(policy_roles, 'missing')
    || '; helper=' || helper
    || '; expression=' || coalesce(policy_expression, 'missing') as details
from policy_checks
order by item_type, object_name;
