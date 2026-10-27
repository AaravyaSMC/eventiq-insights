-- ============================================================================
-- EventIQ — CRM revamp: notes, attachments, business-card scans, enrichment
--
-- company_notes / company_attachments power the editable sections on the
-- company page. card_scans is the audit trail for AI business-card capture
-- (original photo + parsed JSON). companies.enriched_at marks when a company
-- was last enriched from its website.
--
-- Reads of notes/attachments happen in the browser (anon SELECT, same posture
-- as the rest of the app). All writes go through server functions using the
-- service_role key. card_scans is server-only. Both new buckets are PRIVATE —
-- files are served via short-lived signed URLs generated server-side.
-- ============================================================================

-- ----- notes ---------------------------------------------------------------
create table public.company_notes (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_company_notes_updated_at
  before update on public.company_notes
  for each row execute function public.set_updated_at();

create index idx_company_notes_company on public.company_notes (company_id, created_at desc);

-- ----- attachments -----------------------------------------------------------
create table public.company_attachments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  file_name    text not null,
  storage_path text not null, -- path inside the company-attachments bucket
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);

create index idx_company_attachments_company on public.company_attachments (company_id, created_at desc);

-- ----- business-card scans (audit trail, server-only) -------------------------
create table public.card_scans (
  id             uuid primary key default gen_random_uuid(),
  event_year_id  uuid references public.event_years (id) on delete set null,
  image_path     text,                                -- path inside the card-scans bucket
  cards          jsonb not null default '[]'::jsonb,  -- parsed card data from Claude
  cards_detected integer not null default 0,
  committed      boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ----- enrichment timestamp ----------------------------------------------------
alter table public.companies add column if not exists enriched_at timestamptz;

-- ----- RLS -----------------------------------------------------------------------
alter table public.company_notes enable row level security;
alter table public.company_attachments enable row level security;
alter table public.card_scans enable row level security; -- no policies: server-only

create policy "Public read company_notes"
  on public.company_notes for select
  to anon, authenticated
  using (true);

create policy "Public read company_attachments"
  on public.company_attachments for select
  to anon, authenticated
  using (true);

grant select on public.company_notes, public.company_attachments to anon, authenticated;

-- ----- private storage buckets ----------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('card-scans', 'card-scans', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('company-attachments', 'company-attachments', false, 26214400, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
