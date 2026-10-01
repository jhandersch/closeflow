-- Private workspace file storage. Every object lives under its workspace UUID.
insert into storage.buckets (id, name, public, file_size_limit)
values ('closeflow-files', 'closeflow-files', false, 20971520)
on conflict (id) do update
set public = false,
    file_size_limit = 20971520;

-- This SECURITY DEFINER helper avoids recursively evaluating the membership
-- table's own RLS policy when Storage evaluates an object policy.
create or replace function public.can_access_workspace_file_folder(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  return exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_folder::uuid
      and wm.user_id = auth.uid()
  );
end;
$$;

revoke all on function public.can_access_workspace_file_folder(text) from public;
grant execute on function public.can_access_workspace_file_folder(text) to authenticated;

drop policy if exists closeflow_files_workspace_read on storage.objects;
create policy closeflow_files_workspace_read
on storage.objects for select to authenticated
using (
  bucket_id = 'closeflow-files'
  and public.can_access_workspace_file_folder((storage.foldername(name))[1])
);

drop policy if exists closeflow_files_workspace_insert on storage.objects;
create policy closeflow_files_workspace_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'closeflow-files'
  and public.can_access_workspace_file_folder((storage.foldername(name))[1])
);

drop policy if exists closeflow_files_workspace_delete on storage.objects;
create policy closeflow_files_workspace_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'closeflow-files'
  and public.can_access_workspace_file_folder((storage.foldername(name))[1])
);
