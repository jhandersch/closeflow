-- Closes direct-write privilege escalation paths found by the permissions matrix test (B22).
-- Previously every owner/admin/sales_manager could write workspace_members, workspace_invites
-- and workspaces directly through PostgREST, bypassing the API rules (owner-only admin
-- management, AAL2) and the invite RPC (role checks, seat limit).
-- Legitimate writes keep working: invites and memberships are created by SECURITY DEFINER
-- functions, roles/removals go through the API routes, which are subject to these policies.

create or replace function public.workspace_role_of(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select lower(wm.role)
  from public.workspace_members as wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.workspace_role_of(uuid) from public, anon;
grant execute on function public.workspace_role_of(uuid) to authenticated;

-- workspace_members: no direct inserts; owner/admin may change or remove non-owner members only.
drop policy if exists workspace_members_manager_insert on public.workspace_members;
drop policy if exists workspace_members_manager_update on public.workspace_members;
drop policy if exists workspace_members_manager_delete on public.workspace_members;

create policy workspace_members_manager_update on public.workspace_members
  for update to authenticated
  using (
    lower(role) <> 'owner'
    and user_id <> auth.uid()
    and (
      public.workspace_role_of(workspace_id) = 'owner'
      or (public.workspace_role_of(workspace_id) = 'admin' and lower(role) <> 'admin')
    )
  )
  with check (
    lower(role) in ('admin', 'sales_manager', 'sales_rep', 'member', 'viewer')
    and (
      public.workspace_role_of(workspace_id) = 'owner'
      or (public.workspace_role_of(workspace_id) = 'admin' and lower(role) <> 'admin')
    )
  );

create policy workspace_members_manager_delete on public.workspace_members
  for delete to authenticated
  using (
    lower(role) <> 'owner'
    and (
      public.workspace_role_of(workspace_id) = 'owner'
      or (public.workspace_role_of(workspace_id) = 'admin' and lower(role) <> 'admin')
    )
  );

-- workspace_invites: created only via create_workspace_invite_with_limit; no direct update.
drop policy if exists workspace_invites_manager_insert on public.workspace_invites;
drop policy if exists workspace_invites_manager_update on public.workspace_invites;
drop policy if exists workspace_invites_manager_delete on public.workspace_invites;

create policy workspace_invites_manager_delete on public.workspace_invites
  for delete to authenticated
  using (
    public.workspace_role_of(workspace_id) = 'owner'
    or (
      public.workspace_role_of(workspace_id) in ('admin', 'sales_manager')
      and lower(role) not in ('owner', 'admin')
    )
  );

-- workspaces: only the owner may update the row (owner_id cannot be changed away).
drop policy if exists workspaces_manager_update on public.workspaces;

create policy workspaces_owner_update on public.workspaces
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
