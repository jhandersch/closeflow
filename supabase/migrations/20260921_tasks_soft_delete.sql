-- CloseFlow task soft-delete support

alter table if exists public.tasks
  add column if not exists deleted_at timestamptz;

create index if not exists idx_tasks_workspace_deleted
  on public.tasks(workspace_id, deleted_at);