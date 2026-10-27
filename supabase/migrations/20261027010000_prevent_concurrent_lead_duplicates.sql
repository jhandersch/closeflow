create index if not exists idx_leads_workspace_normalized_identity_active
on public.leads (
  workspace_id,
  lower(btrim(coalesce(name, ''))),
  lower(btrim(coalesce(company, '')))
)
where workspace_id is not null and deleted_at is null;

create or replace function public.prevent_duplicate_workspace_lead()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_identity text;
begin
  if new.workspace_id is null or new.deleted_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.workspace_id is not distinct from new.workspace_id
       and lower(btrim(coalesce(old.name, ''))) = lower(btrim(coalesce(new.name, '')))
       and lower(btrim(coalesce(old.company, ''))) = lower(btrim(coalesce(new.company, '')))
       and old.deleted_at is null then
      return new;
    end if;
  end if;

  v_identity :=
    new.workspace_id::text || ':' ||
    lower(btrim(coalesce(new.name, ''))) || ':' ||
    lower(btrim(coalesce(new.company, '')));

  perform pg_advisory_xact_lock(hashtextextended(v_identity, 0));

  if current_setting('closeflow.allow_duplicate_lead', true) = 'on' then
    return new;
  end if;

  if exists (
    select 1
    from public.leads l
    where l.workspace_id = new.workspace_id
      and l.deleted_at is null
      and l.id is distinct from new.id
      and lower(btrim(coalesce(l.name, ''))) = lower(btrim(coalesce(new.name, '')))
      and lower(btrim(coalesce(l.company, ''))) = lower(btrim(coalesce(new.company, '')))
  ) then
    raise exception 'A lead with this name and company already exists in this workspace.'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_workspace_lead on public.leads;
create trigger prevent_duplicate_workspace_lead
before insert or update of workspace_id, name, company, deleted_at
on public.leads
for each row
execute function public.prevent_duplicate_workspace_lead();

revoke all on function public.prevent_duplicate_workspace_lead() from public, anon, authenticated;

create or replace function public.create_lead_with_duplicate_check(
  p_workspace_id uuid,
  p_user_id uuid,
  p_lead jsonb,
  p_allow_duplicate boolean default false
)
returns table (
  lead jsonb,
  duplicate_id uuid,
  created boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_name text;
  v_company text;
  v_duplicate_id uuid;
  v_lead public.leads%rowtype;
begin
  if auth.uid() is null
     or auth.uid() <> p_user_id
     or not public.is_workspace_member(p_workspace_id)
     or not public.can_write_workspace(p_workspace_id) then
    raise exception 'Workspace write access denied' using errcode = '42501';
  end if;

  perform 1
  from public.workspaces w
  where w.id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace not found' using errcode = '42501';
  end if;

  if jsonb_typeof(p_lead) is distinct from 'object' then
    raise exception 'Lead must be a JSON object' using errcode = '22023';
  end if;

  v_name := btrim(coalesce(p_lead ->> 'name', ''));
  v_company := btrim(coalesce(p_lead ->> 'company', ''));
  if v_name = '' then
    raise exception 'Contact name is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_workspace_id::text || ':' ||
      lower(v_name) || ':' ||
      lower(v_company),
      0
    )
  );

  select l.id
  into v_duplicate_id
  from public.leads l
  where l.workspace_id = p_workspace_id
    and l.deleted_at is null
    and lower(btrim(coalesce(l.name, ''))) = lower(v_name)
    and lower(btrim(coalesce(l.company, ''))) = lower(v_company)
  order by l.created_at, l.id
  limit 1;

  if v_duplicate_id is not null and not coalesce(p_allow_duplicate, false) then
    return query select null::jsonb, v_duplicate_id, false;
    return;
  end if;

  perform set_config(
    'closeflow.allow_duplicate_lead',
    case when coalesce(p_allow_duplicate, false) then 'on' else 'off' end,
    true
  );

  insert into public.leads (
    workspace_id,
    user_id,
    created_by,
    name,
    company,
    status,
    value,
    notes,
    source,
    email,
    phone,
    website,
    address,
    tags,
    next_action,
    next_action_date
  )
  values (
    p_workspace_id,
    p_user_id,
    p_user_id,
    v_name,
    v_company,
    coalesce(nullif(p_lead ->> 'status', ''), 'new'),
    coalesce(nullif(p_lead ->> 'value', '')::numeric, 0),
    nullif(p_lead ->> 'notes', ''),
    nullif(p_lead ->> 'source', ''),
    nullif(p_lead ->> 'email', ''),
    nullif(p_lead ->> 'phone', ''),
    nullif(p_lead ->> 'website', ''),
    nullif(p_lead ->> 'address', ''),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(p_lead -> 'tags', '[]'::jsonb))),
      array[]::text[]
    ),
    nullif(p_lead ->> 'next_action', ''),
    nullif(p_lead ->> 'next_action_date', '')::timestamptz
  )
  returning *
  into v_lead;

  insert into public.activities (
    workspace_id,
    lead_id,
    user_id,
    type,
    action,
    title,
    description
  )
  values (
    p_workspace_id,
    v_lead.id,
    p_user_id,
    'created',
    'lead_created',
    'Lead created',
    v_lead.name || ' was added'
  );

  return query select to_jsonb(v_lead), null::uuid, true;
end;
$$;

revoke all on function public.create_lead_with_duplicate_check(uuid, uuid, jsonb, boolean)
from public, anon;
grant execute on function public.create_lead_with_duplicate_check(uuid, uuid, jsonb, boolean)
to authenticated;
