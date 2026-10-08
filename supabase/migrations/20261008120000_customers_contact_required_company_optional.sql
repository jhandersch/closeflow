alter table public.customers
  alter column company drop not null;

update public.customers
set company = nullif(trim(company), '')
where company is not null and trim(company) = '';

update public.customers
set contact = coalesce(nullif(trim(contact), ''), nullif(trim(company), ''), 'Unknown contact')
where contact is null or trim(contact) = '';

alter table public.customers
  alter column contact set not null;

alter table public.customers
  add column if not exists website text,
  add column if not exists address text,
  add column if not exists industry text,
  add column if not exists is_vip boolean not null default false;

create unique index if not exists idx_customers_lead_id_unique
  on public.customers(lead_id);

insert into public.customers (workspace_id, lead_id, company, contact, revenue, status, notes, website, address, industry, is_vip)
select
  lead.workspace_id,
  lead.id,
  nullif(trim(lead.company), ''),
  coalesce(nullif(trim(lead.name), ''), nullif(trim(lead.company), ''), 'Unknown contact'),
  case when lead.status = 'won' then coalesce(lead.value, 0) else 0 end,
  case when lead.status = 'won' then 'active' else 'lost' end,
  lead.notes,
  lead.website,
  lead.address,
  lead.industry,
  coalesce(lead.is_vip, false)
from public.leads as lead
where lead.status in ('won', 'lost')
  and lead.deleted_at is null
on conflict (lead_id) do nothing;
