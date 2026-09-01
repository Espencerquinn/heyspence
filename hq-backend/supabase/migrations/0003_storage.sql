-- 0003_storage.sql — private bucket for BODY RECORD progress photos.
-- Private means objects are never publicly addressable; the app reads them
-- through short-lived signed URLs only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hq-photos', 'hq-photos', false, 10485760,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "hq_photos_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'hq-photos' and hq.is_owner());

create policy "hq_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'hq-photos' and hq.is_owner());

create policy "hq_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'hq-photos' and hq.is_owner());
