-- Core CRM RLS hardening
-- Ensures tenant-safe access across leads, tasks, activities, and calendar events.

alter table public.leads enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.calendar_events enable row level security;

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

drop policy if exists tasks_workspace_member_access on public.tasks;
create policy tasks_workspace_member_access
on public.tasks
for all
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

drop policy if exists activities_workspace_member_access on public.activities;
create policy activities_workspace_member_access
on public.activities
for all
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

drop policy if exists calendar_events_member_select on public.calendar_events;
create policy calendar_events_member_select
on public.calendar_events
for select
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

drop policy if exists calendar_events_member_insert on public.calendar_events;
create policy calendar_events_member_insert
on public.calendar_events
for insert
with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  )
);

drop policy if exists calendar_events_member_update on public.calendar_events;
create policy calendar_events_member_update
on public.calendar_events
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

drop policy if exists calendar_events_member_delete on public.calendar_events;
create policy calendar_events_member_delete
on public.calendar_events
for delete
using (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  )
);