create or replace function public.create_workspace_with_limit(
  p_name text,
  p_slug text default null,
  p_industry text default null,
  p_size text default null
)
returns table (
  workspace_id uuid,
  name text,
  slug text,
  owner_id uuid,
  plan text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_owned_count integer;
  v_has_business boolean;
  v_limit integer;
  v_workspace public.workspaces%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'Workspace name is required'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select pg_catalog.count(*)::integer
  into v_owned_count
  from public.workspaces as w
  where w.owner_id = v_user_id;

  select exists (
    select 1
    from public.workspaces as w
    where w.owner_id = v_user_id
      and public.workspace_plan_tier(w.id) = 'business'
  )
  into v_has_business;

  v_limit := case when v_has_business then 5 else 1 end;
  if v_owned_count >= v_limit then
    raise exception 'Workspace owner capacity reached (%/%). Each workspace has separate billing.',
      v_owned_count, v_limit
      using errcode = '23514',
            constraint = 'workspace_owner_capacity';
  end if;

  insert into public.workspaces (
    name,
    slug,
    industry,
    size,
    owner_id,
    plan
  )
  values (
    v_name,
    p_slug,
    p_industry,
    p_size,
    v_user_id,
    'free'
  )
  returning * into v_workspace;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role
  )
  values (
    v_workspace.id,
    v_user_id,
    'owner'
  );

  return query
  select
    v_workspace.id,
    v_workspace.name,
    v_workspace.slug,
    v_workspace.owner_id,
    v_workspace.plan,
    v_workspace.created_at;
end;
$$;

revoke all on function public.create_workspace_with_limit(text, text, text, text)
  from public, anon;
grant execute on function public.create_workspace_with_limit(text, text, text, text)
  to authenticated;
