-- Diver's Companion: foundation + core tables
-- Run once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1. Foundation ------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 2. Divers ----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Diver',
  initials text not null default 'D',
  home_area text,
  diving_since text,
  home_site_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'display_name', new.email), 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  diver_id uuid not null references public.profiles(id) on delete cascade,
  agency text not null,
  level text not null,
  number_last4 text check (number_last4 ~ '^[0-9A-Za-z]{0,4}$'),
  certified_on date,
  status text not null default 'in_review' check (status in ('verified', 'in_review', 'unverified')),
  card_front_path text,
  card_back_path text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists certifications_diver_idx on public.certifications (diver_id);

create or replace function public.has_verified_cert(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.certifications where diver_id = uid and status = 'verified');
$$;

-- 3. Directory -------------------------------------------------------------
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('spring', 'reef', 'wreck', 'shore', 'drift')),
  access text not null check (access in ('shore', 'boat')),
  area text not null,
  lat double precision not null,
  lng double precision not null,
  max_depth_ft int not null,
  min_depth_ft int,
  min_cert text not null default 'Open Water',
  summary text,
  water_source_type text not null default 'model' check (water_source_type in ('coops', 'spring', 'model')),
  water_station_id text,
  water_station_label text,
  spring_temp_f numeric(4,1),
  tide_station_id text,
  tide_station_label text,
  usgs_gauge_id text,
  usgs_gauge_label text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_home_site_fk;
alter table public.profiles add constraint profiles_home_site_fk foreign key (home_site_id) references public.sites(id) on delete set null;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('shop', 'resort', 'charter')),
  area text not null,
  lat double precision not null,
  lng double precision not null,
  phone text,
  website text,
  offer text,
  claimed_by uuid references auth.users(id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Conditions and dives --------------------------------------------------
create table if not exists public.condition_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  diver_id uuid references public.profiles(id) on delete set null,
  reported_at timestamptz not null default now(),
  depth_ft int check (depth_ft between 0 and 400),
  temp_f numeric(4,1) check (temp_f between 30 and 100),
  visibility_ft int check (visibility_ft between 0 and 300),
  current text check (current in ('none', 'light', 'moderate', 'strong')),
  note text check (char_length(note) <= 500),
  is_demo boolean not null default false
);
create index if not exists condition_reports_site_time_idx on public.condition_reports (site_id, reported_at desc);

create table if not exists public.dives (
  id uuid primary key default gen_random_uuid(),
  diver_id uuid not null references public.profiles(id) on delete cascade,
  site_id uuid not null references public.sites(id),
  date date not null,
  max_depth_ft int not null check (max_depth_ft between 1 and 400),
  bottom_min int not null check (bottom_min between 1 and 600),
  temp_at_depth_f numeric(4,1) check (temp_at_depth_f between 30 and 100),
  visibility_ft int check (visibility_ft between 0 and 300),
  current text check (current in ('none', 'light', 'moderate', 'strong')),
  exposure_suit text,
  notes text,
  share_conditions boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dives_diver_date_idx on public.dives (diver_id, date desc);

-- A shared dive feeds the site's conditions automatically.
create or replace function public.dive_to_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.share_conditions and (new.temp_at_depth_f is not null or new.visibility_ft is not null) then
    insert into public.condition_reports (site_id, diver_id, reported_at, depth_ft, temp_f, visibility_ft, current)
    values (new.site_id, new.diver_id, now(), new.max_depth_ft, new.temp_at_depth_f, new.visibility_ft, new.current);
  end if;
  return new;
end $$;
drop trigger if exists dives_share_conditions on public.dives;
create trigger dives_share_conditions after insert on public.dives
  for each row execute function public.dive_to_report();

-- 5. Open dives (buddy finding) --------------------------------------------
create table if not exists public.open_dives (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id),
  host_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  access text not null check (access in ('shore', 'boat')),
  max_depth_ft int not null check (max_depth_ft between 5 and 400),
  pace text not null default 'Relaxed pace',
  spots_open int not null default 1 check (spots_open between 1 and 6),
  min_cert text not null default 'Open Water',
  note text check (char_length(note) <= 280),
  status text not null default 'open' check (status in ('open', 'full', 'cancelled')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists open_dives_starts_idx on public.open_dives (starts_at);

create table if not exists public.open_dive_requests (
  id uuid primary key default gen_random_uuid(),
  open_dive_id uuid not null references public.open_dives(id) on delete cascade,
  diver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (open_dive_id, diver_id)
);

-- Triggers for updated_at
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists sites_touch on public.sites;
create trigger sites_touch before update on public.sites for each row execute function public.touch_updated_at();
drop trigger if exists businesses_touch on public.businesses;
create trigger businesses_touch before update on public.businesses for each row execute function public.touch_updated_at();

-- 6. Row level security ----------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.certifications enable row level security;
alter table public.sites enable row level security;
alter table public.businesses enable row level security;
alter table public.condition_reports enable row level security;
alter table public.dives enable row level security;
alter table public.open_dives enable row level security;
alter table public.open_dive_requests enable row level security;

drop policy if exists "admins read admin list" on public.admin_users;
create policy "admins read admin list" on public.admin_users for select to authenticated using (public.is_admin());
drop policy if exists "super admins manage admins" on public.admin_users;
create policy "super admins manage admins" on public.admin_users for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Profiles: signed-in divers can see each other (needed for open dives); only you edit yours.
drop policy if exists "profiles readable by divers" on public.profiles;
create policy "profiles readable by divers" on public.profiles for select to authenticated using (true);
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Certifications: private to the diver. Divers submit as in_review; only admins verify.
drop policy if exists "own certs read" on public.certifications;
create policy "own certs read" on public.certifications for select to authenticated using (diver_id = auth.uid() or public.is_admin());
drop policy if exists "own certs submit" on public.certifications;
create policy "own certs submit" on public.certifications for insert to authenticated with check (diver_id = auth.uid() and status = 'in_review');
drop policy if exists "own certs edit while in review" on public.certifications;
create policy "own certs edit while in review" on public.certifications for update to authenticated using (diver_id = auth.uid() and status <> 'verified') with check (diver_id = auth.uid() and status = 'in_review');
drop policy if exists "own certs delete" on public.certifications;
create policy "own certs delete" on public.certifications for delete to authenticated using (diver_id = auth.uid());
drop policy if exists "admins review certs" on public.certifications;
create policy "admins review certs" on public.certifications for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Directory: public read, admin write.
drop policy if exists "sites public read" on public.sites;
create policy "sites public read" on public.sites for select to anon, authenticated using (true);
drop policy if exists "sites admin write" on public.sites;
create policy "sites admin write" on public.sites for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "businesses public read" on public.businesses;
create policy "businesses public read" on public.businesses for select to anon, authenticated using (true);
drop policy if exists "businesses admin write" on public.businesses;
create policy "businesses admin write" on public.businesses for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "owners update claimed listing" on public.businesses;
create policy "owners update claimed listing" on public.businesses for update to authenticated using (claimed_by = auth.uid()) with check (claimed_by = auth.uid());

-- Condition reports: public read, divers add their own.
drop policy if exists "reports public read" on public.condition_reports;
create policy "reports public read" on public.condition_reports for select to anon, authenticated using (true);
drop policy if exists "divers add reports" on public.condition_reports;
create policy "divers add reports" on public.condition_reports for insert to authenticated with check (diver_id = auth.uid());
drop policy if exists "divers remove own reports" on public.condition_reports;
create policy "divers remove own reports" on public.condition_reports for delete to authenticated using (diver_id = auth.uid() or public.is_admin());

-- Dives: private logbook.
drop policy if exists "own dives" on public.dives;
create policy "own dives" on public.dives for all to authenticated using (diver_id = auth.uid()) with check (diver_id = auth.uid());

-- Open dives: signed-in divers browse; only verified divers post.
drop policy if exists "open dives readable" on public.open_dives;
create policy "open dives readable" on public.open_dives for select to authenticated using (true);
drop policy if exists "verified divers post" on public.open_dives;
create policy "verified divers post" on public.open_dives for insert to authenticated with check (host_id = auth.uid() and public.has_verified_cert());
drop policy if exists "hosts manage own" on public.open_dives;
create policy "hosts manage own" on public.open_dives for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
drop policy if exists "hosts delete own" on public.open_dives;
create policy "hosts delete own" on public.open_dives for delete to authenticated using (host_id = auth.uid() or public.is_admin());

-- Requests: requester and host can see them; only verified divers request; host accepts or declines.
drop policy if exists "requests visible to both sides" on public.open_dive_requests;
create policy "requests visible to both sides" on public.open_dive_requests for select to authenticated using (
  diver_id = auth.uid() or exists (select 1 from public.open_dives d where d.id = open_dive_id and d.host_id = auth.uid())
);
drop policy if exists "verified divers request" on public.open_dive_requests;
create policy "verified divers request" on public.open_dive_requests for insert to authenticated with check (
  diver_id = auth.uid() and status = 'pending' and public.has_verified_cert()
);
drop policy if exists "requester withdraws" on public.open_dive_requests;
create policy "requester withdraws" on public.open_dive_requests for update to authenticated using (diver_id = auth.uid()) with check (diver_id = auth.uid() and status = 'withdrawn');
drop policy if exists "host responds" on public.open_dive_requests;
create policy "host responds" on public.open_dive_requests for update to authenticated using (
  exists (select 1 from public.open_dives d where d.id = open_dive_id and d.host_id = auth.uid())
) with check (status in ('accepted', 'declined'));

-- 7. Storage for certification card photos (private) -----------------------
insert into storage.buckets (id, name, public) values ('cert-cards', 'cert-cards', false)
on conflict (id) do nothing;

drop policy if exists "divers upload own cards" on storage.objects;
create policy "divers upload own cards" on storage.objects for insert to authenticated
  with check (bucket_id = 'cert-cards' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "divers and admins read cards" on storage.objects;
create policy "divers and admins read cards" on storage.objects for select to authenticated
  using (bucket_id = 'cert-cards' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "divers delete own cards" on storage.objects;
create policy "divers delete own cards" on storage.objects for delete to authenticated
  using (bucket_id = 'cert-cards' and (storage.foldername(name))[1] = auth.uid()::text);

-- 8. Starter dive sites (verify coordinates, depths and station IDs before launch)
insert into public.sites (slug, name, kind, access, area, lat, lng, max_depth_ft, min_depth_ft, min_cert, summary, water_source_type, water_station_id, water_station_label, spring_temp_f, tide_station_id, tide_station_label, usgs_gauge_id, usgs_gauge_label, is_demo) values
('blue-heron-bridge', 'Blue Heron Bridge', 'shore', 'shore', 'Riviera Beach', 26.7836, -80.0425, 25, null, 'Open Water', 'A shallow shore dive under the bridge at Phil Foster Park, known for macro life. Best around high slack tide.', 'coops', '8722670', 'Lake Worth Pier station', null, '8722670', 'Lake Worth Pier', null, null, true),
('peanut-island', 'Peanut Island', 'shore', 'shore', 'Riviera Beach', 26.7717, -80.0453, 15, null, 'Open Water', 'Calm, clear water along the island rock line. Popular for snorkeling and easy training dives.', 'coops', '8722670', 'Lake Worth Pier station', null, '8722670', 'Lake Worth Pier', null, null, true),
('breakers-reef', 'Breakers Reef', 'drift', 'boat', 'Palm Beach', 26.7205, -80.0255, 70, 50, 'Advanced Open Water', 'A boat drift dive along a reef line off Palm Beach, often with turtles and a steady Gulf Stream push.', 'model', null, null, null, '8722670', 'Lake Worth Pier', null, null, true),
('devils-den', 'Devil''s Den', 'spring', 'shore', 'Williston', 29.4087, -82.4764, 54, null, 'Open Water', 'A prehistoric spring inside a dry cave, lit by a single opening in the roof.', 'spring', null, null, 72, null, null, null, null, true),
('blue-grotto', 'Blue Grotto', 'spring', 'shore', 'Williston', 29.3747, -82.4815, 100, null, 'Open Water', 'A clear-water spring and cavern with a stationary air bell at 30 ft.', 'spring', null, null, 72, null, null, null, null, true),
('ginnie-springs', 'Ginnie Springs', 'spring', 'shore', 'High Springs', 29.8363, -82.7002, 50, null, 'Open Water', 'Crystal springs on the Santa Fe River, including the Ballroom and the Devil''s Eye system.', 'spring', null, null, 72, null, null, '02322500', 'Santa Fe River near Fort White', true),
('rainbow-river', 'Rainbow River', 'drift', 'shore', 'Dunnellon', 29.1020, -82.4370, 25, null, 'Open Water', 'A slow, spring-fed river drift over eelgrass and limestone vents.', 'spring', null, null, 72, null, null, null, null, true),
('spiegel-grove', 'Spiegel Grove', 'wreck', 'boat', 'Key Largo', 25.0662, -80.3107, 130, 60, 'Advanced Open Water', 'A 510 ft former Navy ship sunk as an artificial reef in 2002. Wreck training is recommended.', 'model', null, null, null, null, null, null, null, true),
('molasses-reef', 'Molasses Reef', 'reef', 'boat', 'Key Largo', 25.0103, -80.3747, 40, null, 'Open Water', 'A classic Keys spur-and-groove reef with shallow coral and plenty of reef fish.', 'model', null, null, null, null, null, null, null, true)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
