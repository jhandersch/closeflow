-- Split legacy workspace-member mutation policies so viewers retain reads but cannot write.
drop policy if exists customers_member_mutation on public.customers;
drop policy if exists customers_member_select on public.customers;
create policy customers_member_select
on public.customers
for select
using (public.is_workspace_member(workspace_id));
create policy customers_member_insert
on public.customers
for insert
with check (public.can_write_workspace(workspace_id));
create policy customers_member_update
on public.customers
for update
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));
create policy customers_member_delete
on public.customers
for delete
using (public.can_write_workspace(workspace_id));

drop policy if exists ai_conversations_member_access on public.ai_conversations;
create policy ai_conversations_member_select
on public.ai_conversations
for select
using (public.is_workspace_member(workspace_id));
create policy ai_conversations_member_insert
on public.ai_conversations
for insert
with check (public.can_write_workspace(workspace_id));
create policy ai_conversations_member_update
on public.ai_conversations
for update
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));
create policy ai_conversations_member_delete
on public.ai_conversations
for delete
using (public.can_write_workspace(workspace_id));

drop policy if exists revenue_events_member_access on public.revenue_events;
create policy revenue_events_member_select
on public.revenue_events
for select
using (public.is_workspace_member(workspace_id));
create policy revenue_events_member_insert
on public.revenue_events
for insert
with check (public.can_write_workspace(workspace_id));
create policy revenue_events_member_update
on public.revenue_events
for update
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));
create policy revenue_events_member_delete
on public.revenue_events
for delete
using (public.can_write_workspace(workspace_id));

drop policy if exists usage_member_access on public.usage;
create policy usage_member_select
on public.usage
for select
using (public.is_workspace_member(workspace_id));
create policy usage_member_insert
on public.usage
for insert
with check (public.can_write_workspace(workspace_id));
create policy usage_member_update
on public.usage
for update
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));
create policy usage_member_delete
on public.usage
for delete
using (public.can_write_workspace(workspace_id));

alter function public.consume_workspace_usage(uuid, text, text, text)
rename to consume_workspace_usage_member;
revoke all on function public.consume_workspace_usage_member(uuid, text, text, text)
from public, anon, authenticated;

create function public.consume_workspace_usage(
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
