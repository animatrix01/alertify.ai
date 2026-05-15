insert into storage.buckets (id, name, public) values ('sos-images', 'sos-images', true) on conflict (id) do nothing;

create policy "SOS images public read"
on storage.objects for select
using (bucket_id = 'sos-images');

create policy "SOS images user upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'sos-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "SOS images user update"
on storage.objects for update to authenticated
using (bucket_id = 'sos-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "SOS images user delete"
on storage.objects for delete to authenticated
using (bucket_id = 'sos-images' and auth.uid()::text = (storage.foldername(name))[1]);