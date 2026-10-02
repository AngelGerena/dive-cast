-- DiveCast 007: business logos (public bucket, admin-managed)
alter table public.businesses add column if not exists logo_url text;

insert into storage.buckets (id, name, public) values ('business-logos', 'business-logos', true)
on conflict (id) do update set public = true;

drop policy if exists "business logos public read" on storage.objects;
create policy "business logos public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'business-logos');
drop policy if exists "admins upload business logos" on storage.objects;
create policy "admins upload business logos" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-logos' and public.is_admin());
drop policy if exists "admins update business logos" on storage.objects;
create policy "admins update business logos" on storage.objects for update to authenticated
  using (bucket_id = 'business-logos' and public.is_admin()) with check (bucket_id = 'business-logos' and public.is_admin());
drop policy if exists "admins delete business logos" on storage.objects;
create policy "admins delete business logos" on storage.objects for delete to authenticated
  using (bucket_id = 'business-logos' and public.is_admin());

notify pgrst, 'reload schema';
