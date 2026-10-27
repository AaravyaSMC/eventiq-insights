-- card_scans is server-only: belt-and-braces revoke of the default grants
-- (RLS already filters all rows for anon; this makes the intent explicit).
revoke all on public.card_scans from anon, authenticated;
