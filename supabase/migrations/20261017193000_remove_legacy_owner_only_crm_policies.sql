-- Remove pre-workspace policies that grant access based only on user_id.
-- They are permissive and otherwise OR together with the workspace-scoped policies.
drop policy if exists "users can view own workspace leads" on public.leads;
drop policy if exists "users can insert own workspace leads" on public.leads;
drop policy if exists "users can update own workspace leads" on public.leads;
drop policy if exists "users can delete own workspace leads" on public.leads;

drop policy if exists leads_workspace_member_select on public.leads;
create policy leads_workspace_member_select
on public.leads
for select
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

drop policy if exists leads_workspace_member_insert on public.leads;
create policy leads_workspace_member_insert
on public.leads
for insert
with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  )
);

drop policy if exists leads_workspace_member_update on public.leads;
create policy leads_workspace_member_update
on public.leads
for update
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
)
with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  )
);

drop policy if exists leads_workspace_member_delete on public.leads;
create policy leads_workspace_member_delete
on public.leads
for delete
using (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  )
);

drop policy if exists "allow select own activities" on public.activities;
drop policy if exists "allow insert own activities" on public.activities;
drop policy if exists activities_select_by_lead_owner on public.activities;
drop policy if exists activities_insert_by_lead_owner on public.activities;
