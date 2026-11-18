-- RLS helper functions are used by authenticated workspace policies only.
-- Do not expose membership predicates as callable public/anonymous RPCs.
revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.is_workspace_manager(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_manager(uuid) to authenticated;
