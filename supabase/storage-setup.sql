insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'auvne-images',
  'auvne-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant insert, delete on storage.objects to anon, authenticated;

drop policy if exists "Auvne owner uploads images" on storage.objects;
create policy "Auvne owner uploads images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'auvne-images'
  and (storage.foldername(name))[1] = 'admin'
  and (storage.foldername(name))[2] = 'REPLACE_WITH_FIREBASE_ADMIN_UID'
  and (select auth.jwt() ->> 'iss') = 'https://securetoken.google.com/auvne-eba39'
  and (select auth.jwt() ->> 'aud') = 'auvne-eba39'
  and (select auth.jwt() ->> 'sub') = 'REPLACE_WITH_FIREBASE_ADMIN_UID'
);

drop policy if exists "Auvne owner removes images" on storage.objects;
create policy "Auvne owner removes images"
on storage.objects
for delete
to anon, authenticated
using (
  bucket_id = 'auvne-images'
  and (storage.foldername(name))[1] = 'admin'
  and (storage.foldername(name))[2] = 'REPLACE_WITH_FIREBASE_ADMIN_UID'
  and (select auth.jwt() ->> 'iss') = 'https://securetoken.google.com/auvne-eba39'
  and (select auth.jwt() ->> 'aud') = 'auvne-eba39'
  and (select auth.jwt() ->> 'sub') = 'REPLACE_WITH_FIREBASE_ADMIN_UID'
);
