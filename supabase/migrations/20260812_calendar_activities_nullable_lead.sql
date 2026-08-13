-- Allow calendar-only activity records to be written without a lead link.

alter table if exists public.activities
  alter column lead_id drop not null;