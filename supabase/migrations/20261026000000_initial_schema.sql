-- ============================================================================
-- EventIQ — initial schema (fresh database)
--
-- Data model:
--   events ──< event_years ──< company_event_participation >── companies
--   companies ──< contacts (optionally tied to the event_year they were met at)
--   import_history logs every committed CSV import.
--
-- Reads happen in the browser with the anon key (see the RLS migration);
-- all writes go through server functions using the service_role key.
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ----- updated_at bookkeeping ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----- events ----------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  location    text,
  website     text,
  description text,
  cover_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ----- event_years (one row per edition of an event) --------------------------
create table public.event_years (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  year       integer not null check (year between 1900 and 2100),
  created_at timestamptz not null default now(),
  unique (event_id, year)
);

create index idx_event_years_event on public.event_years (event_id);

-- ----- companies ---------------------------------------------------------------
create table public.companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  website          text,
  linkedin         text,
  country          text,
  headquarters     text,
  industry         text,
  description      text,
  primary_service  text,
  services         jsonb not null default '[]'::jsonb, -- string[]
  service_tags     jsonb not null default '[]'::jsonb, -- string[] (fallback for industry/services)
  countries_served jsonb not null default '[]'::jsonb, -- string[]
  founded_year     integer,
  employees_range  text,    -- e.g. "51-200"
  employee_count   integer,
  revenue_range    text,    -- e.g. "$10M-$50M"
  revenue          text,    -- free-text fallback
  target_market    text,
  business_model   text,    -- e.g. "B2B"
  business_type    text,    -- doubles as service category in the UI
  ownership        text,    -- "Private" / "Public"
  status           text,    -- CRM status, defaults to "Prospect" in the UI
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- Import dedup matches on normalized name and website.
create index idx_companies_name_lower on public.companies (lower(name));
create index idx_companies_website on public.companies (website);
create index idx_companies_country on public.companies (country);

-- ----- company_event_participation (company <-> event_year link) ---------------
create table public.company_event_participation (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  event_year_id     uuid not null references public.event_years (id) on delete cascade,
  source_file       text,    -- CSV file the link came from (if imported)
  source_row_number integer, -- serial number in that file
  extra_fields      jsonb not null default '{}'::jsonb, -- unrecognized CSV columns
  created_at        timestamptz not null default now(),
  unique (company_id, event_year_id)
);

create index idx_cep_company on public.company_event_participation (company_id);
create index idx_cep_event_year on public.company_event_participation (event_year_id);

-- ----- contacts -----------------------------------------------------------------
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references public.companies (id) on delete cascade,
  event_year_id uuid references public.event_years (id) on delete set null, -- where the contact was met
  name          text,
  designation   text,
  department    text,
  email         text,
  phone         text,
  linkedin      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

create index idx_contacts_company on public.contacts (company_id);
create index idx_contacts_event_year on public.contacts (event_year_id);
create index idx_contacts_email_lower on public.contacts (lower(email));

-- ----- import_history (one row per committed CSV import) -------------------------
create table public.import_history (
  id                uuid primary key default gen_random_uuid(),
  file_name         text not null,
  rows_processed    integer not null default 0,
  events_created    integer not null default 0,
  companies_created integer not null default 0,
  companies_updated integer not null default 0,
  contacts_created  integer not null default 0,
  duplicates_found  integer not null default 0,
  warnings          jsonb, -- string[] of row-level warnings, null when clean
  created_at        timestamptz not null default now()
);
