alter table public.automation_runs
  add column if not exists dedupe_key text;

create unique index if not exists automation_runs_dedupe_key_idx
  on public.automation_runs (automation_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists automation_runs_workspace_created_idx
  on public.automation_runs (workspace_id, created_at desc);

-- Runs are written by the acting workspace member when a lead event fires.
drop policy if exists automation_runs_manager_insert on public.automation_runs;
drop policy if exists automation_runs_member_insert on public.automation_runs;
drop policy if exists automation_runs_member_update on public.automation_runs;
create policy automation_runs_member_update on public.automation_runs
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy automation_runs_member_insert on public.automation_runs
  for insert with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.automations a
      where a.id = automation_id and a.workspace_id = automation_runs.workspace_id
    )
  );
