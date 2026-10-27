-- ============================================================================
-- EventIQ — Row Level Security
--
-- The browser reads with the anon key, so the five tables the UI renders get
-- SELECT-only policies for anon/authenticated. All writes go through TanStack
-- Start server functions using the service_role key, which BYPASSES RLS — so
-- no insert/update/delete policies are needed.
--
-- import_history gets RLS enabled with NO policies: invisible to the browser,
-- still writable by the server (service_role).
--
-- NOTE: anyone holding the anon key (it ships in the JS bundle) can read these
-- five tables. Only keep this if the CRM data isn't sensitive; otherwise add
-- Supabase Auth and swap `to anon, authenticated` for `to authenticated`.
-- ============================================================================

-- Lock everything down first.
alter table public.events enable row level security;
alter table public.event_years enable row level security;
alter table public.companies enable row level security;
alter table public.company_event_participation enable row level security;
alter table public.contacts enable row level security;
alter table public.import_history enable row level security;

-- Public read on the tables the app renders.
create policy "Public read events"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "Public read event_years"
  on public.event_years for select
  to anon, authenticated
  using (true);

create policy "Public read companies"
  on public.companies for select
  to anon, authenticated
  using (true);

create policy "Public read company_event_participation"
  on public.company_event_participation for select
  to anon, authenticated
  using (true);

create policy "Public read contacts"
  on public.contacts for select
  to anon, authenticated
  using (true);

-- Belt-and-braces: anon/authenticated keep only SELECT at the grant level too,
-- so even a future permissive policy can't open writes from the browser.
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on
  public.events,
  public.event_years,
  public.companies,
  public.company_event_participation,
  public.contacts
to anon, authenticated;
