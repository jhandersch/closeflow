-- Keep per-record deletions intact while cascading lead deletion/restoration
-- to related tasks and calendar events.

alter table public.tasks
  add column if not exists deleted_with_lead boolean not null default false;

alter table public.calendar_events
  add column if not exists deleted_with_lead boolean not null default false;

create or replace function public.soft_delete_lead_dependents(
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

  update public.calendar_events
  set deleted_at = p_deleted_at,
      deleted_with_lead = true,
      updated_at = p_deleted_at
  where lead_id = p_lead_id
    and workspace_id = p_workspace_id
    and deleted_at is null;
end;
$$;

create or replace function public.restore_lead_dependents(
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

  update public.calendar_events
  set deleted_at = null,
      deleted_with_lead = false,
      updated_at = now()
  where lead_id = p_lead_id
    and workspace_id = p_workspace_id
    and deleted_with_lead = true;
end;
$$;

create or replace function public.soft_delete_task(
  p_task_id uuid,
  p_workspace_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.tasks
  set deleted_at = now(),
      deleted_with_lead = false
  where id = p_task_id
    and deleted_at is null
    and (
      (workspace_id = p_workspace_id and p_workspace_id is not null and public.is_workspace_member(p_workspace_id))
      or (workspace_id is null and p_workspace_id is null and user_id = auth.uid())
    );
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.soft_delete_lead_dependents(uuid, uuid, timestamptz) from public;
revoke all on function public.restore_lead_dependents(uuid, uuid) from public;
revoke all on function public.soft_delete_task(uuid, uuid) from public;
grant execute on function public.soft_delete_lead_dependents(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.restore_lead_dependents(uuid, uuid) to authenticated;
grant execute on function public.soft_delete_task(uuid, uuid) to authenticated;
