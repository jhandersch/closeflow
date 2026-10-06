-- Preserve task deletion state when a parent lead is moved to the trash,
-- and add recoverable calendar event deletion.

alter table public.tasks
  add column if not exists deleted_with_lead boolean not null default false;

alter table public.calendar_events
  add column if not exists deleted_at timestamptz;

create index if not exists idx_calendar_events_workspace_deleted
  on public.calendar_events(workspace_id, deleted_at);

create or replace function public.soft_delete_lead_tasks(
  p_lead_id uuid,
  p_workspace_id uuid,
  p_deleted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
    or not public.is_workspace_member(p_workspace_id)
    or not exists (
      select 1 from public.leads
      where id = p_lead_id
        and workspace_id = p_workspace_id
        and deleted_at = p_deleted_at
    ) then
    raise exception 'Lead not found or workspace access denied';
  end if;

  update public.tasks
  set deleted_at = p_deleted_at,
      deleted_with_lead = true
  where lead_id = p_lead_id
    and workspace_id = p_workspace_id
    and deleted_at is null;

end;
$$;

create or replace function public.restore_lead_tasks(
  p_lead_id uuid,
  p_workspace_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
    or not public.is_workspace_member(p_workspace_id)
    or not exists (
      select 1 from public.leads
      where id = p_lead_id
        and workspace_id = p_workspace_id
        and deleted_at is null
    ) then
    raise exception 'Lead not found or workspace access denied';
  end if;

  update public.tasks
  set deleted_at = null,
      deleted_with_lead = false
  where lead_id = p_lead_id
    and workspace_id = p_workspace_id
    and deleted_with_lead = true;

end;
$$;

revoke all on function public.soft_delete_lead_tasks(uuid, uuid, timestamptz) from public;
revoke all on function public.restore_lead_tasks(uuid, uuid) from public;
grant execute on function public.soft_delete_lead_tasks(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.restore_lead_tasks(uuid, uuid) to authenticated;
