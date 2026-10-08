alter table public.customers
  alter column company drop not null;

update public.customers
set contact = coalesce(nullif(trim(contact), ''), nullif(trim(company), ''), 'Unknown contact')
where contact is null or trim(contact) = '';

alter table public.customers
  alter column contact set not null;
