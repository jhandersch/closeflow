-- These functions are used by authenticated application paths or database triggers.
-- They must not be callable through the anonymous public RPC surface.
revoke all on function public.can_write_workspace(uuid) from public, anon;
revoke all on function public.create_onboarding_workspace(text, text, text, text) from public, anon;
revoke all on function public.update_updated_at_column() from public, anon;

grant execute on function public.can_write_workspace(uuid) to authenticated;
grant execute on function public.create_onboarding_workspace(text, text, text, text) to authenticated;
grant execute on function public.update_updated_at_column() to authenticated;
