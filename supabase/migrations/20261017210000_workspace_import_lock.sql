-- Per-workspace lease lock that serializes bulk imports so the duplicate check
-- (read before insert) cannot race with a concurrent import in the same workspace.
-- The lease expires on its own, so a crashed request cannot block imports forever.
create table if not exists public.workspace_import_locks (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  token uuid not null,
  locked_until timestamptz not null
);

alter table public.workspace_import_locks enable row level security;
revoke all on public.workspace_import_locks from anon, authenticated;

create or replace function public.acquire_workspace_import_lock(p_workspace_id uuid, p_ttl_seconds integer default 120)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token uuid := gen_random_uuid();
  v_row uuid;
begin
  if auth.uid() is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.workspace_import_locks as l (workspace_id, token, locked_until)
  values (p_workspace_id, v_token, now() + make_interval(secs => least(greatest(p_ttl_seconds, 5), 600)))
  on conflict (workspace_id) do update
    set token = excluded.token, locked_until = excluded.locked_until
    where l.locked_until < now()
  returning token into v_row;

  return v_row;
end;
$$;

create or replace function public.release_workspace_import_lock(p_workspace_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.workspace_import_locks where workspace_id = p_workspace_id and token = p_token;
end;
$$;

revoke all on function public.acquire_workspace_import_lock(uuid, integer) from public, anon;
revoke all on function public.release_workspace_import_lock(uuid, uuid) from public, anon;
grant execute on function public.acquire_workspace_import_lock(uuid, integer) to authenticated;
grant execute on function public.release_workspace_import_lock(uuid, uuid) to authenticated;
