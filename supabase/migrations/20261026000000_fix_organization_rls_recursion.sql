create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_organization_manager(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.member_user_id = auth.uid()
      and m.status = 'active'
      and lower(m.role) in ('owner', 'admin')
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_manager(uuid) from public;
grant execute on function public.is_organization_member(uuid) to anon, authenticated;
grant execute on function public.is_organization_manager(uuid) to anon, authenticated;

drop policy if exists organizations_select_for_members on public.organizations;
create policy organizations_select_for_members on public.organizations
for select
using (public.is_organization_member(id));

drop policy if exists organizations_update_owner_or_admin on public.organizations;
create policy organizations_update_owner_or_admin on public.organizations
for update
using (public.is_organization_manager(id))
with check (public.is_organization_manager(id));

drop policy if exists members_select_for_active_members on public.organization_members;
create policy members_select_for_active_members on public.organization_members
for select
using (public.is_organization_member(organization_id));

drop policy if exists members_insert_for_owner_or_admin on public.organization_members;
create policy members_insert_for_owner_or_admin on public.organization_members
for insert
with check (public.is_organization_manager(organization_id));

drop policy if exists members_update_for_owner_or_admin on public.organization_members;
create policy members_update_for_owner_or_admin on public.organization_members
for update
using (public.is_organization_manager(organization_id))
with check (public.is_organization_manager(organization_id));

drop policy if exists invites_select_for_active_members on public.organization_invites;
create policy invites_select_for_active_members on public.organization_invites
for select
using (public.is_organization_member(organization_id));

drop policy if exists invites_insert_for_owner_or_admin on public.organization_invites;
create policy invites_insert_for_owner_or_admin on public.organization_invites
for insert
with check (
  invited_by = auth.uid()
  and public.is_organization_manager(organization_id)
);

drop policy if exists invites_update_for_owner_or_admin on public.organization_invites;
create policy invites_update_for_owner_or_admin on public.organization_invites
for update
using (public.is_organization_manager(organization_id))
with check (public.is_organization_manager(organization_id));

drop policy if exists invites_delete_for_owner_or_admin on public.organization_invites;
create policy invites_delete_for_owner_or_admin on public.organization_invites
for delete
using (public.is_organization_manager(organization_id));

drop policy if exists organization_audit_events_select_for_active_members on public.organization_audit_events;
create policy organization_audit_events_select_for_active_members on public.organization_audit_events
for select
using (public.is_organization_member(organization_id));
