-- lead_automations existed only in production (no migration). Capture it and
-- make the insert policy reject rows whose workspace_id differs from the lead's.
create table if not exists public.lead_automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  lead_id uuid not null references public.leads(id) on delete cascade,
  trigger_key text not null,
  task_id uuid,
  created_at timestamptz default now()
);

alter table public.lead_automations enable row level security;

drop policy if exists "Users can create their lead automations" on public.lead_automations;
create policy "Users can create their lead automations"
  on public.lead_automations
  for insert
  with check (
    exists (
      select 1
      from public.leads l
      where l.id = lead_automations.lead_id
        and l.user_id = auth.uid()
        and lead_automations.workspace_id is not distinct from l.workspace_id
    )
  );
