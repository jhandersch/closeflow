-- Transactional account data cleanup. Everything below runs in one transaction:
-- either all rows are handed over / removed, or nothing changes.
-- Callable by service_role only (the API route checks aal2 + confirmation first).
create or replace function public.delete_account_data(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_solo uuid[];
  v_shared record;
  v_table text;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  -- Lock the user's workspaces so members cannot be added or removed while we decide
  -- between solo and shared handling.
  perform 1
  from public.workspaces w
  where w.id in (select m.workspace_id from public.workspace_members m where m.user_id = p_user_id)
  for update;

  select coalesce(array_agg(m.workspace_id), '{}')
    into v_solo
  from public.workspace_members m
  where m.user_id = p_user_id
    and not exists (
      select 1 from public.workspace_members o
      where o.workspace_id = m.workspace_id and o.user_id <> p_user_id
    );

  if exists (
    select 1
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id and m.user_id = p_user_id
    where w.owner_id = p_user_id
      and not (w.id = any (v_solo))
  ) then
    return 'owner_has_members';
  end if;

  for v_shared in
    select w.id, w.owner_id
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id and m.user_id = p_user_id
    where not (w.id = any (v_solo))
  loop
    foreach v_table in array array['calendar_events', 'activities', 'tasks', 'leads'] loop
      execute format('update public.%I set user_id = $1 where user_id = $2 and workspace_id = $3', v_table)
        using v_shared.owner_id, p_user_id, v_shared.id;
    end loop;
  end loop;

  foreach v_table in array array['calendar_events', 'activities', 'tasks', 'leads'] loop
    execute format('delete from public.%I where user_id = $1 and (workspace_id is null or workspace_id = any ($2))', v_table)
      using p_user_id, v_solo;
  end loop;

  delete from public.notifications where user_id = p_user_id;
  delete from public.workspace_members where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  return 'ok';
end;
$$;

revoke all on function public.delete_account_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_data(uuid) to service_role;
