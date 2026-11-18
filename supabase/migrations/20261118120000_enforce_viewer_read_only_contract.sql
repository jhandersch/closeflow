-- Make viewer read-only enforcement idempotent and cover all viewer-write surfaces.

-- CRM and usage tables
drop policy if exists customers_member_mutation on public.customers;
drop policy if exists customers_member_select on public.customers;
drop policy if exists customers_member_insert on public.customers;
drop policy if exists customers_member_update on public.customers;
drop policy if exists customers_member_delete on public.customers;
create policy customers_member_select on public.customers for select
using (public.is_workspace_member(workspace_id));
create policy customers_member_insert on public.customers for insert
with check (public.can_write_workspace(workspace_id));
create policy customers_member_update on public.customers for update
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));
create policy customers_member_delete on public.customers for delete
using (public.can_write_workspace(workspace_id));

drop policy if exists ai_conversations_member_access on public.ai_conversations;
drop policy if exists ai_conversations_member_select on public.ai_conversations;
drop policy if exists ai_conversations_member_insert on public.ai_conversations;
drop policy if exists ai_conversations_member_update on public.ai_conversations;
drop policy if exists ai_conversations_member_delete on public.ai_conversations;
create policy ai_conversations_member_select on public.ai_conversations for select
using (public.is_workspace_member(workspace_id));
create policy ai_conversations_member_insert on public.ai_conversations for insert
with check (public.can_write_workspace(workspace_id));
create policy ai_conversations_member_update on public.ai_conversations for update
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));
create policy ai_conversations_member_delete on public.ai_conversations for delete
using (public.can_write_workspace(workspace_id));

drop policy if exists revenue_events_member_access on public.revenue_events;
drop policy if exists revenue_events_member_select on public.revenue_events;
drop policy if exists revenue_events_member_insert on public.revenue_events;
drop policy if exists revenue_events_member_update on public.revenue_events;
drop policy if exists revenue_events_member_delete on public.revenue_events;
create policy revenue_events_member_select on public.revenue_events for select
using (public.is_workspace_member(workspace_id));
create policy revenue_events_member_insert on public.revenue_events for insert
with check (public.can_write_workspace(workspace_id));
create policy revenue_events_member_update on public.revenue_events for update
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));
create policy revenue_events_member_delete on public.revenue_events for delete
using (public.can_write_workspace(workspace_id));

drop policy if exists usage_member_access on public.usage;
drop policy if exists usage_member_select on public.usage;
drop policy if exists usage_member_insert on public.usage;
drop policy if exists usage_member_update on public.usage;
drop policy if exists usage_member_delete on public.usage;
create policy usage_member_select on public.usage for select
using (public.is_workspace_member(workspace_id));
create policy usage_member_insert on public.usage for insert
with check (public.can_write_workspace(workspace_id));
create policy usage_member_update on public.usage for update
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));
create policy usage_member_delete on public.usage for delete
using (public.can_write_workspace(workspace_id));

-- Restrict usage metering for viewers.
create or replace function public.consume_workspace_usage(
  p_workspace_id uuid,
  p_month text,
  p_bucket text,
  p_request_key text
)
returns table (
  allowed boolean,
  current_count integer,
  usage_limit integer,
  plan text,
  already_counted boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_bucket = 'ai' and not public.can_write_workspace(p_workspace_id) then
    raise exception 'Viewers have read-only access to this workspace.'
      using errcode = '42501';
  end if;

  return query
  select *
  from public.consume_workspace_usage_member(
    p_workspace_id,
    p_month,
    p_bucket,
    p_request_key
  );
end;
$$;

revoke all on function public.consume_workspace_usage(uuid, text, text, text)
from public, anon;
grant execute on function public.consume_workspace_usage(uuid, text, text, text)
to authenticated;

-- Replace SECURITY DEFINER task/restore functions with write-access guards.
create or replace function public.soft_delete_lead_dependents(
  p_lead_id uuid,
  p_workspace_id uuid,
  p_deleted_at timestamptz
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_write_workspace(p_workspace_id)
    or not exists (
      select 1 from public.leads
      where id = p_lead_id and workspace_id = p_workspace_id
        and deleted_at = p_deleted_at
    ) then
    raise exception 'Lead not found or workspace access denied';
  end if;

  update public.tasks set deleted_at = p_deleted_at, deleted_with_lead = true
  where lead_id = p_lead_id and workspace_id = p_workspace_id and deleted_at is null;

  update public.calendar_events set deleted_at = p_deleted_at,
    deleted_with_lead = true, updated_at = p_deleted_at
  where lead_id = p_lead_id and workspace_id = p_workspace_id and deleted_at is null;
end;
$$;

create or replace function public.restore_lead_dependents(
  p_lead_id uuid,
  p_workspace_id uuid
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_write_workspace(p_workspace_id)
    or not exists (
      select 1 from public.leads
      where id = p_lead_id and workspace_id = p_workspace_id and deleted_at is null
    ) then
    raise exception 'Lead not found or workspace access denied';
  end if;

  update public.tasks set deleted_at = null, deleted_with_lead = false
  where lead_id = p_lead_id and workspace_id = p_workspace_id
    and deleted_with_lead = true;

  update public.calendar_events set deleted_at = null,
    deleted_with_lead = false, updated_at = now()
  where lead_id = p_lead_id and workspace_id = p_workspace_id
    and deleted_with_lead = true;
end;
$$;

create or replace function public.soft_delete_task(
  p_task_id uuid,
  p_workspace_id uuid
)
returns boolean language plpgsql security definer set search_path = public
as $$
declare affected integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.tasks set deleted_at = now(), deleted_with_lead = false
  where id = p_task_id and deleted_at is null
    and (
      (workspace_id = p_workspace_id and p_workspace_id is not null
        and public.can_write_workspace(p_workspace_id))
      or (workspace_id is null and p_workspace_id is null and user_id = auth.uid())
    );
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.soft_delete_lead_tasks(
  p_lead_id uuid,
  p_workspace_id uuid,
  p_deleted_at timestamptz
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_write_workspace(p_workspace_id)
    or not exists (
      select 1 from public.leads
      where id = p_lead_id and workspace_id = p_workspace_id
        and deleted_at = p_deleted_at
    ) then
    raise exception 'Lead not found or workspace access denied';
  end if;

  update public.tasks set deleted_at = p_deleted_at, deleted_with_lead = true
  where lead_id = p_lead_id and workspace_id = p_workspace_id and deleted_at is null;
end;
$$;

create or replace function public.restore_lead_tasks(
  p_lead_id uuid,
  p_workspace_id uuid
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_write_workspace(p_workspace_id)
    or not exists (
      select 1 from public.leads
      where id = p_lead_id and workspace_id = p_workspace_id and deleted_at is null
    ) then
    raise exception 'Lead not found or workspace access denied';
  end if;

  update public.tasks set deleted_at = null, deleted_with_lead = false
  where lead_id = p_lead_id and workspace_id = p_workspace_id
    and deleted_with_lead = true;
end;
$$;
