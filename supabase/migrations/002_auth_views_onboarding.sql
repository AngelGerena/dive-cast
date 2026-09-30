-- DiveCast 002: onboarding flag, profile backfill, public feeds
-- Run after 001_foundation_and_core.sql.

alter table public.profiles add column if not exists onboarded boolean not null default false;

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

-- Profiles for anyone who signed up before the trigger existed
insert into public.profiles (id, display_name, initials)
select u.id, split_part(u.email, '@', 1), upper(left(u.email, 1))
from auth.users u
on conflict (id) do nothing;

-- Reports with a short diver name (first name and last initial), readable by everyone
create or replace view public.condition_reports_feed as
select
  r.id, r.site_id, r.diver_id, r.reported_at, r.depth_ft, r.temp_f, r.visibility_ft, r.current, r.note,
  case
    when p.display_name is null then 'A diver'
    when position(' ' in trim(p.display_name)) > 0
      then split_part(trim(p.display_name), ' ', 1) || ' ' || left(split_part(trim(p.display_name), ' ', 2), 1) || '.'
    else trim(p.display_name)
  end as diver_name
from public.condition_reports r
left join public.profiles p on p.id = r.diver_id;

grant select on public.condition_reports_feed to anon, authenticated;

-- Open dives with host name, verified flag and accepted count, signed-in divers only
create or replace view public.open_dives_feed as
select
  od.id, od.site_id, od.host_id, od.starts_at, od.access, od.max_depth_ft, od.pace, od.spots_open,
  od.min_cert, od.note, od.status, od.created_at,
  p.display_name as host_name,
  p.initials as host_initials,
  public.has_verified_cert(od.host_id) as host_verified,
  (select c.level from public.certifications c
    where c.diver_id = od.host_id and c.status = 'verified'
    order by c.certified_on desc nulls last limit 1) as host_cert,
  (select count(*) from public.open_dive_requests q
    where q.open_dive_id = od.id and q.status = 'accepted')::int as accepted_count
from public.open_dives od
join public.profiles p on p.id = od.host_id
where od.status <> 'cancelled' and od.starts_at > now() - interval '6 hours';

revoke all on public.open_dives_feed from anon;
grant select on public.open_dives_feed to authenticated;

notify pgrst, 'reload schema';

-- Let a diver clear their own request (used when re-requesting after withdrawing)
drop policy if exists "requester removes own request" on public.open_dive_requests;
create policy "requester removes own request" on public.open_dive_requests for delete to authenticated using (diver_id = auth.uid());

notify pgrst, 'reload schema';
