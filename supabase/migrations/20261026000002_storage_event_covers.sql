-- ============================================================================
-- EventIQ — storage bucket for event cover images
--
-- Covers are uploaded server-side (service_role bypasses storage RLS) as
-- `<event-slug>.<ext>` and served to everyone via the bucket's public URL, so
-- no storage.objects policies are needed.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers',
  'event-covers',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
