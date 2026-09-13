-- Fix ON CONFLICT (workspace_id) target: the existing index is partial
-- (WHERE workspace_id IS NOT NULL) and therefore does not satisfy
-- upsert(..., { onConflict: "workspace_id" }), causing 42P10.
-- Guard: fails loudly instead of silently if orphaned null rows exist.
do $$
begin
  if exists (select 1 from public.subscriptions where workspace_id is null) then
    raise exception 'subscriptions has rows with null workspace_id; clean up before running this migration';
  end if;
end $$;

alter table public.subscriptions
  alter column workspace_id set not null;

alter table public.subscriptions
  drop constraint if exists subscriptions_workspace_id_key;

alter table public.subscriptions
  add constraint subscriptions_workspace_id_key unique (workspace_id);

drop index if exists idx_subscriptions_workspace_id_unique;
