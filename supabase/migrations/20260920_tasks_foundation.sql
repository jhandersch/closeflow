-- CloseFlow tasks foundation
-- Ensures the tasks table exists for the CRM, automation, search, and demo seed flows.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  completed boolean not null default false,
  priority text not null default 'medium',
  assigned_to uuid references auth.users(id) on delete set null,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists description text,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists priority text not null default 'medium',
  add column if not exists due_date timestamptz;

create index if not exists idx_tasks_workspace_id
  on public.tasks(workspace_id);

create index if not exists idx_tasks_lead_id
  on public.tasks(lead_id);

create index if not exists idx_tasks_user_id
  on public.tasks(user_id);

create index if not exists idx_tasks_due_date
  on public.tasks(due_date);

alter table public.tasks enable row level security;

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