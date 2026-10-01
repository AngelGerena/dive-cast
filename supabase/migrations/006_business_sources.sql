-- DiveCast 006: track where each listing came from, so OpenStreetMap imports never duplicate.
alter table public.businesses add column if not exists source text not null default 'manual' check (source in ('manual', 'osm'));
alter table public.businesses add column if not exists osm_id text;

drop index if exists public.businesses_osm_id_key;
alter table public.businesses drop constraint if exists businesses_osm_id_key;
alter table public.businesses add constraint businesses_osm_id_key unique (osm_id);

notify pgrst, 'reload schema';
