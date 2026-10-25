-- Remove legacy owner-only task policies. Permissive policies are OR-ed, so they let a viewer
-- (who is not blocked by user_id checks) bypass the workspace write policies on public.tasks.
drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;
drop policy if exists tasks_select_by_lead_owner on public.tasks;
drop policy if exists tasks_insert_by_lead_owner on public.tasks;
drop policy if exists tasks_update_by_lead_owner on public.tasks;
drop policy if exists tasks_delete_by_lead_owner on public.tasks;
