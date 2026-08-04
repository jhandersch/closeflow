-- CloseFlow soft-delete support for leads
-- Adds deleted_at and supporting index in an idempotent way.

alter table if exists public.leads
  add column if not exists deleted_at timestamptz;

create index if not exists idx_leads_workspace_deleted
  on public.leads(workspace_id, deleted_at);
