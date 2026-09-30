-- DiveCast 003: cover photo per dive site (optional override of the photos bundled with the app)
alter table public.sites add column if not exists cover_photo_url text;
alter table public.sites add column if not exists cover_photo_credit text;

notify pgrst, 'reload schema';
