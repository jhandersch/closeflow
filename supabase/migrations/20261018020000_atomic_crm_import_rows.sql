create or replace function public.import_leads_with_activity(
  p_workspace_id uuid,
  p_user_id uuid,
  p_rows jsonb,
  p_operation text
)
returns table (
  row_number integer,
  lead_id uuid,
  name text,
  company text,
  error_message text
)
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_row jsonb;
  v_row_number integer;
  v_lead_id uuid;
  v_name text;
  v_company text;
  v_error text;
begin
  if auth.uid() is null
     or auth.uid() <> p_user_id
     or not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_operation is null
     or p_operation not in ('insert', 'update')
     or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Invalid import payload' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 100 then
    raise exception 'Import batch exceeds 100 rows' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_row_number := (v_row ->> 'rowNumber')::integer;
    begin
      if p_operation = 'insert' then
        insert into public.leads as l (
          workspace_id, user_id, created_by, name, company, status, value,
          notes, source, email, phone, website, address, tags,
          stage_changed_at, last_activity_at
        )
        values (
          p_workspace_id, p_user_id, p_user_id,
          v_row ->> 'name',
          coalesce(v_row ->> 'company', ''),
          v_row ->> 'status',
          (v_row ->> 'value')::numeric,
          v_row ->> 'notes',
          v_row ->> 'source',
          v_row ->> 'email',
          v_row ->> 'phone',
          v_row ->> 'website',
          v_row ->> 'address',
          coalesce(
            array(select jsonb_array_elements_text(coalesce(v_row -> 'tags', '[]'::jsonb))),
            array[]::text[]
          ),
          (v_row ->> 'stageChangedAt')::timestamptz,
          (v_row ->> 'lastActivityAt')::timestamptz
        )
        returning l.id, l.name, l.company
        into v_lead_id, v_name, v_company;
      else
        update public.leads as l
        set
          name = v_row ->> 'name',
          company = coalesce(v_row ->> 'company', ''),
          status = v_row ->> 'status',
          value = (v_row ->> 'value')::numeric,
          notes = v_row ->> 'notes',
          source = v_row ->> 'source',
          email = v_row ->> 'email',
          phone = v_row ->> 'phone',
          website = v_row ->> 'website',
          address = v_row ->> 'address',
          tags = coalesce(
            array(select jsonb_array_elements_text(coalesce(v_row -> 'tags', '[]'::jsonb))),
            array[]::text[]
          ),
          stage_changed_at = (v_row ->> 'stageChangedAt')::timestamptz,
          last_activity_at = (v_row ->> 'lastActivityAt')::timestamptz
        where id = (v_row ->> 'id')::uuid
          and workspace_id = p_workspace_id
        returning l.id, l.name, l.company
        into v_lead_id, v_name, v_company;

        if not found then
          raise exception 'Lead no longer exists in this workspace';
        end if;
      end if;

      insert into public.activities (
        workspace_id, lead_id, user_id, title, description, action, type, metadata
      )
      values (
        p_workspace_id,
        v_lead_id,
        p_user_id,
        case when p_operation = 'insert' then 'Lead imported from CSV' else 'Lead updated from CSV' end,
        case when p_operation = 'insert' then 'Lead imported from CSV' else 'Lead updated from CSV import' end,
        case when p_operation = 'insert' then 'Lead imported from CSV' else 'Lead updated from CSV' end,
        case when p_operation = 'insert' then 'created' else 'updated' end,
        jsonb_build_object('source', 'csv_import')
      );

      return query select v_row_number, v_lead_id, v_name, v_company, null::text;
    exception when others then
      get stacked diagnostics v_error = message_text;
      return query select
        v_row_number,
        null::uuid,
        v_row ->> 'name',
        coalesce(v_row ->> 'company', ''),
        v_error;
    end;
  end loop;
end;
$$;

revoke all on function public.import_leads_with_activity(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.import_leads_with_activity(uuid, uuid, jsonb, text) to authenticated;

create or replace function public.import_customer_with_activity(
  p_workspace_id uuid,
  p_user_id uuid,
  p_rows jsonb
)
returns table (
  row_number integer,
  lead_id uuid,
  error_message text
)
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_row jsonb;
  v_row_number integer;
  v_contact text;
  v_company text;
  v_revenue numeric;
  v_lead_id uuid;
  v_error text;
begin
  if auth.uid() is null
     or auth.uid() <> p_user_id
     or not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Invalid import payload' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 100 then
    raise exception 'Import batch exceeds 100 rows' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_row_number := (v_row ->> 'rowNumber')::integer;
    begin
      v_contact := btrim(coalesce(v_row ->> 'contact', ''));
      v_company := btrim(coalesce(v_row ->> 'company', ''));
      v_revenue := (v_row ->> 'revenue')::numeric;

      if v_contact = '' then
        raise exception 'Missing required field: contact';
      end if;

      if exists (
        select 1
        from public.customers as c
        where c.workspace_id = p_workspace_id
          and lower(btrim(coalesce(c.contact, ''))) = lower(v_contact)
          and lower(btrim(coalesce(c.company, ''))) = lower(v_company)
      ) or exists (
        select 1
        from public.leads as l
        where l.workspace_id = p_workspace_id
          and l.deleted_at is null
          and lower(btrim(coalesce(l.name, ''))) = lower(v_contact)
          and lower(btrim(coalesce(l.company, ''))) = lower(v_company)
      ) then
        raise exception 'Duplicate customer (contact + company already exists)';
      end if;

      insert into public.leads as l (
        workspace_id, user_id, created_by, name, company, status, value,
        source, notes, stage_changed_at, last_activity_at
      )
      values (
        p_workspace_id, p_user_id, p_user_id, v_contact, v_company, 'won',
        v_revenue, 'other', 'Imported from customers file', now(), now()
      )
      returning id into v_lead_id;

      insert into public.customers (
        workspace_id, lead_id, contact, company, revenue, status, notes
      )
      values (
        p_workspace_id,
        v_lead_id,
        v_contact,
        v_company,
        v_revenue,
        'active',
        'Imported from customers file'
      );

      insert into public.activities (
        workspace_id, lead_id, user_id, title, description, action, type, metadata
      )
      values (
        p_workspace_id,
        v_lead_id,
        p_user_id,
        'Customer imported from file',
        'Customer imported from file',
        'Customer imported from file',
        'created',
        jsonb_build_object('source', 'customers_import')
      );

      return query select v_row_number, v_lead_id, null::text;
    exception when others then
      get stacked diagnostics v_error = message_text;
      return query select v_row_number, null::uuid, v_error;
    end;
  end loop;
end;
$$;

revoke all on function public.import_customer_with_activity(uuid, uuid, jsonb) from public, anon;
grant execute on function public.import_customer_with_activity(uuid, uuid, jsonb) to authenticated;
