-- Calendar and activity domain normalization
-- Increments schema without destructive changes.

create extension if not exists pgcrypto;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activities add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.activities add column if not exists title text;
alter table public.activities add column if not exists description text;
alter table public.activities add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Keep legacy action field for compatibility and reporting.
update public.activities
set title = coalesce(title, action),
    description = coalesce(description, action)
where title is null
   or description is null;

update public.activities a
set workspace_id = l.workspace_id
from public.leads l
where a.lead_id = l.id
  and a.workspace_id is null
  and l.workspace_id is not null;

update public.calendar_events ce
set workspace_id = l.workspace_id
from public.leads l
where ce.lead_id = l.id
  and ce.workspace_id is null
  and l.workspace_id is not null;

create index if not exists idx_calendar_events_workspace_scheduled
  on public.calendar_events(workspace_id, scheduled_at);
create index if not exists idx_calendar_events_user_scheduled
  on public.calendar_events(user_id, scheduled_at);
create index if not exists idx_calendar_events_lead_scheduled
  on public.calendar_events(lead_id, scheduled_at);

create index if not exists idx_activities_workspace_created
  on public.activities(workspace_id, created_at desc);
create index if not exists idx_activities_user_created
  on public.activities(user_id, created_at desc);

alter table public.calendar_events enable row level security;

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