-- Read-only post-migration verification for 20261014170000.
-- Run in the Supabase SQL Editor after an explicitly authorized migration.

with expected_functions(function_name, identity_args, expected_search_path) as (
  values
    (
      'consume_workspace_usage',
      'p_workspace_id uuid, p_month text, p_bucket text, p_request_key text',
      'search_path=pg_catalog, public'
    ),
    (
      'workspace_plan_tier',
      'p_workspace_id uuid',
      'search_path=pg_catalog, public'
    ),
    (
      'enforce_workspace_lead_capacity',
      '',
      'search_path=pg_catalog, public'
    ),
    (
      'create_workspace_invite_with_limit',
      'p_workspace_id uuid, p_email text, p_role text, p_token text, p_expires_at timestamp with time zone',
      'search_path=pg_catalog, pg_temp'
    ),
    (
      'accept_workspace_invite_with_limit',
      'p_token text',
      'search_path=pg_catalog, pg_temp'
    )
),
function_checks as (
  select
    'function_security_and_search_path:' || e.function_name as check_name,
    coalesce(
      p.prosecdef
      and p.proconfig @> array[e.expected_search_path],
      false
    ) as passed,
    coalesce(
      e.expected_search_path || '; security_definer=' || p.prosecdef::text,
      'function missing'
    ) as detail
  from expected_functions e
  left join pg_proc p
    on p.pronamespace = 'public'::regnamespace
   and p.proname = e.function_name
   and pg_get_function_identity_arguments(p.oid) = e.identity_args
),
checks as (
  select
    'usage_events_rls' as check_name,
    coalesce(c.relrowsecurity, false) as passed,
    coalesce('rls_enabled=' || c.relrowsecurity::text, 'table missing') as detail
  from (values (1)) seed(dummy)
  left join pg_class c
    on c.oid = 'public.usage_events'::regclass

  union all

  select
    'usage_events_bucket_constraint',
    exists (
      select 1
      from pg_constraint con
      where con.conrelid = 'public.usage_events'::regclass
        and con.contype = 'c'
        and con.conname = 'usage_events_bucket_check'
        and pg_get_constraintdef(con.oid) like '%ai%export%'
    ),
    coalesce((
      select pg_get_constraintdef(con.oid)
      from pg_constraint con
      where con.conrelid = 'public.usage_events'::regclass
        and con.contype = 'c'
        and con.conname = 'usage_events_bucket_check'
      limit 1
    ), 'AI/export bucket constraint missing')

  union all

  select
    'usage_events_workspace_cascade_fk',
    exists (
      select 1
      from pg_constraint con
      where con.conrelid = 'public.usage_events'::regclass
        and con.contype = 'f'
        and con.confrelid = 'public.workspaces'::regclass
        and con.confdeltype = 'c'
        and pg_get_constraintdef(con.oid) like 'FOREIGN KEY (workspace_id)%'
    ),
    coalesce((
      select pg_get_constraintdef(con.oid)
      from pg_constraint con
      where con.conrelid = 'public.usage_events'::regclass
        and con.contype = 'f'
        and con.confrelid = 'public.workspaces'::regclass
        and con.confdeltype = 'c'
      limit 1
    ), 'workspace cascade foreign key missing')

  union all

  select
    'usage_events_unique_idempotency_key',
    exists (
      select 1
      from pg_constraint con
      where con.conrelid = 'public.usage_events'::regclass
        and con.contype = 'u'
        and pg_get_constraintdef(con.oid) like
          'UNIQUE (workspace_id, month, bucket, request_key)%'
    ),
    coalesce((
      select pg_get_constraintdef(con.oid)
      from pg_constraint con
      where con.conrelid = 'public.usage_events'::regclass
        and con.contype = 'u'
        and pg_get_constraintdef(con.oid) like
          'UNIQUE (workspace_id, month, bucket, request_key)%'
      limit 1
    ), 'required unique constraint missing')

  union all

  select
    'usage_events_member_select_policy',
    exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'usage_events'
        and p.policyname = 'usage_events_member_select'
        and p.cmd = 'SELECT'
        and p.roles @> array['authenticated']::name[]
        and p.qual like '%is_workspace_member%'
    ),
    coalesce((
      select p.qual
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'usage_events'
        and p.policyname = 'usage_events_member_select'
      limit 1
    ), 'required member-scoped SELECT policy missing')

  union all

  select
    'consume_workspace_usage_grants',
    p.oid is not null
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      ),
    coalesce('authenticated execute; anon/public denied', 'function missing')
  from (values (1)) seed(dummy)
  left join pg_proc p
    on p.oid = to_regprocedure(
      'public.consume_workspace_usage(uuid,text,text,text)'
    )

  union all

  select
    'invite_rpcs_grants',
    count(*) = 2
      and bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
      and bool_and(not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      )),
    'authenticated execute; anon/public denied'
  from pg_proc p
  where p.oid in (
    to_regprocedure(
      'public.create_workspace_invite_with_limit(uuid,text,text,text,timestamptz)'
    ),
    to_regprocedure('public.accept_workspace_invite_with_limit(text)')
  )

  union all

  select
    'workspace_file_and_lead_restore_rpc_grants',
    count(*) = 6
      and bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
      and bool_and(not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      )),
    'authenticated execute; anon/public denied for file helper and lead restore RPCs'
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in (
      'can_access_workspace_file_folder',
      'soft_delete_lead_tasks',
      'restore_lead_tasks',
      'soft_delete_lead_dependents',
      'restore_lead_dependents',
      'soft_delete_task'
    )

  union all

  select
    'workspace_plan_tier_not_client_executable',
    p.oid is not null
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      ),
    'only owner/service role should execute plan helper'
  from (values (1)) seed(dummy)
  left join pg_proc p
    on p.oid = to_regprocedure('public.workspace_plan_tier(uuid)')

  union all

  select
    'lead_capacity_trigger_function_grants',
    p.oid is not null
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      ),
    'trigger-only execution; anon/authenticated/public direct execute denied'
  from (values (1)) seed(dummy)
  left join pg_proc p
    on p.oid = to_regprocedure('public.enforce_workspace_lead_capacity()')

  union all

  select
    'lead_capacity_trigger',
    exists (
      select 1
      from pg_trigger t
      where t.tgrelid = 'public.leads'::regclass
        and not t.tgisinternal
        and t.tgname = 'enforce_workspace_lead_capacity'
        and pg_get_triggerdef(t.oid) like
          'CREATE TRIGGER enforce_workspace_lead_capacity BEFORE INSERT OR UPDATE OF workspace_id, status, deleted_at%'
    ),
    coalesce((
      select pg_get_triggerdef(t.oid)
      from pg_trigger t
      where t.tgrelid = 'public.leads'::regclass
        and not t.tgisinternal
        and t.tgname = 'enforce_workspace_lead_capacity'
      limit 1
    ), 'required active-lead trigger missing')

  union all

  select
    'invite_functions_exclude_expired_seats',
    count(*) = 2
      and bool_and(position('wi.expires_at > pg_catalog.now()' in pg_get_functiondef(p.oid)) > 0),
    'both create and accept RPCs must count only unexpired pending invites'
  from pg_proc p
  where p.oid in (
    to_regprocedure(
      'public.create_workspace_invite_with_limit(uuid,text,text,text,timestamptz)'
    ),
    to_regprocedure('public.accept_workspace_invite_with_limit(text)')
  )

  union all

  select
    'sales_manager_privileged_role_guard',
    position(
      'v_actor_role = ''sales_manager'''
    in lower(pg_get_functiondef(p.oid))
    ) > 0
      and position(
        'v_role not in (''sales_rep'', ''member'', ''viewer'')'
      in lower(pg_get_functiondef(p.oid))
      ) > 0,
    'sales managers can assign non-privileged roles only'
  from pg_proc p
  where p.oid = to_regprocedure(
    'public.create_workspace_invite_with_limit(uuid,text,text,text,timestamptz)'
  )

  union all

  select
    f.check_name,
    f.passed,
    f.detail
  from function_checks f

  union all

  select
    'migration_ledger_20261015002000',
    case when exists (
      select 1
      from supabase_migrations.schema_migrations
      where version = '20261015002000'
    ) then true else null end,
    'informational before ACL migration; expected after successful application'

  union all

  select
    'migration_ledger_20261014170000',
    case when exists (
      select 1
      from supabase_migrations.schema_migrations
      where version = '20261014170000'
    ) then true else null end,
    'informational before migration; expected after successful application'
)
select
  check_name,
  case
    when passed is null then 'INFO'
    when passed then 'PASS'
    else 'FAIL'
  end as result,
  detail
from checks
order by check_name;
