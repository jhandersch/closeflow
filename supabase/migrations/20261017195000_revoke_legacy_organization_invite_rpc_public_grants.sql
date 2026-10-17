begin;

revoke all on function public.create_organization_invite(uuid, text, text, integer)
  from public, anon;
grant execute on function public.create_organization_invite(uuid, text, text, integer)
  to authenticated;

revoke all on function public.accept_organization_invite(uuid, text, text, text)
  from public, anon;
grant execute on function public.accept_organization_invite(uuid, text, text, text)
  to authenticated;

commit;
