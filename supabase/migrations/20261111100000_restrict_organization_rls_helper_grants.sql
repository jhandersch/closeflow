revoke all on function public.is_organization_member(uuid) from public, anon;
revoke all on function public.is_organization_manager(uuid) from public, anon;

grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_manager(uuid) to authenticated;
