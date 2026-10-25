-- Enforce the read-only "viewer" role at the database level.
-- The UI writes leads, tasks, activities and calendar events directly through the Supabase client,
-- so API-route guards alone are not enough. Reads stay available to every workspace member.

create or replace function public.can_write_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role <> 'viewer'
  );
$$;

-- leads
drop policy if exists leads_workspace_member_insert on public.leads;
create policy leads_workspace_member_insert
on public.leads
for insert
with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or public.can_write_workspace(workspace_id)
  )
);

drop policy if exists leads_workspace_member_update on public.leads;
create policy leads_workspace_member_update
on public.leads
for update
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.can_write_workspace(workspace_id))
)
with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or public.can_write_workspace(workspace_id)
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
    or public.can_write_workspace(workspace_id)
  )
);

-- tasks: split the former "for all" policy into read and write policies
drop policy if exists tasks_workspace_member_access on public.tasks;
drop policy if exists tasks_workspace_member_select on public.tasks;
create policy tasks_workspace_member_select
on public.tasks
for select
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

drop policy if exists tasks_workspace_member_insert on public.tasks;
create policy tasks_workspace_member_insert
on public.tasks
for insert
with check (
  user_id = auth.uid()
  and (workspace_id is null or public.can_write_workspace(workspace_id))
);

drop policy if exists tasks_workspace_member_update on public.tasks;
create policy tasks_workspace_member_update
on public.tasks
for update
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.can_write_workspace(workspace_id))
)
with check (
  user_id = auth.uid()
  and (workspace_id is null or public.can_write_workspace(workspace_id))
);

drop policy if exists tasks_workspace_member_delete on public.tasks;
create policy tasks_workspace_member_delete
on public.tasks
for delete
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.can_write_workspace(workspace_id))
);

-- activities: same split
drop policy if exists activities_workspace_member_access on public.activities;
drop policy if exists activities_workspace_member_select on public.activities;
create policy activities_workspace_member_select
on public.activities
for select
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

drop policy if exists activities_workspace_member_insert on public.activities;
create policy activities_workspace_member_insert
on public.activities
for insert
with check (
  user_id = auth.uid()
  and (workspace_id is null or public.can_write_workspace(workspace_id))
);

drop policy if exists activities_workspace_member_update on public.activities;
create policy activities_workspace_member_update
on public.activities
for update
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.can_write_workspace(workspace_id))
)
with check (
  user_id = auth.uid()
  and (workspace_id is null or public.can_write_workspace(workspace_id))
);

drop policy if exists activities_workspace_member_delete on public.activities;
create policy activities_workspace_member_delete
on public.activities
for delete
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.can_write_workspace(workspace_id))
);

-- calendar_events
drop policy if exists calendar_events_member_insert on public.calendar_events;
create policy calendar_events_member_insert
on public.calendar_events
for insert
with check (
  user_id = auth.uid()
  and (workspace_id is null or public.can_write_workspace(workspace_id))
);

drop policy if exists calendar_events_member_update on public.calendar_events;
create policy calendar_events_member_update
on public.calendar_events
for update
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.can_write_workspace(workspace_id))
)
with check (
  user_id = auth.uid()
  and (workspace_id is null or public.can_write_workspace(workspace_id))
);

drop policy if exists calendar_events_member_delete on public.calendar_events;
create policy calendar_events_member_delete
on public.calendar_events
for delete
using (
  user_id = auth.uid()
  and (workspace_id is null or public.can_write_workspace(workspace_id))
);
