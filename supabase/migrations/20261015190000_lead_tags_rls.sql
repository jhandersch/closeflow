alter table public.lead_tags enable row level security;
alter table public.lead_tag_links enable row level security;

drop policy if exists lead_tags_member_access on public.lead_tags;
create policy lead_tags_member_access on public.lead_tags
  for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists lead_tag_links_member_access on public.lead_tag_links;
create policy lead_tag_links_member_access on public.lead_tag_links
  for all
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_tag_links.lead_id
        and public.is_workspace_member(l.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.leads l
      join public.lead_tags t on t.id = lead_tag_links.tag_id
      where l.id = lead_tag_links.lead_id
        and t.workspace_id = l.workspace_id
        and public.is_workspace_member(l.workspace_id)
    )
  );
