# DiveCast

Installable PWA for Florida divers: live conditions, dive sites, open dives (buddy finding) and a logbook.
Stack: React + Vite + TypeScript, Supabase, Netlify.

## What works in this build (v0.1)

- Home: home site or next joined dive, surface water temperature, air, temperature at depth, visibility, tide chart, open dives, saved sites
- Explore: Florida map with sites, shops, charters and resorts as separate layers, search, site cards
- Site pages: live conditions, NOAA tide chart (coastal) or USGS river level (springs), temperature by depth with thermocline detection, recent diver reports, nearby businesses and partner offers
- Open dives: browse, filter, request to join, post your own (verified certification required)
- Logbook: yearly stats, dive profile, log a dive; shared dives feed the site's temperature by depth chart
- Profile: certifications, emergency card link, Abyss (dark) and Pelagic (light) themes
- Emergency card: stored only on the phone, works offline
- PWA: manifest, icons, service worker, offline app shell, cached conditions and map tiles, install prompt (Android/desktop) and Add to Home Screen hint (iPhone)

v0.2 adds email sign-in (code or link), first-run profile setup, certification photo upload with admin review, and Supabase storage for dives, reports and open dives. Conditions, sites and the emergency card work without an account.

## Run locally

    npm install
    npm run dev

## Deploy (GitHub to Netlify)

1. Push this folder to a new GitHub repo.
2. Netlify: Add new project > Import from GitHub > pick the repo. Build settings come from `netlify.toml` (`npm run build`, publish `dist`).
3. When Supabase is ready, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project configuration > Environment variables, then redeploy.

## Supabase

Run `supabase/migrations/001_foundation_and_core.sql`, then `002_auth_views_onboarding.sql`, in the SQL Editor.

Authentication settings:
- Authentication > URL Configuration: Site URL = your Netlify URL; add it and http://localhost:5173 to Redirect URLs
- Authentication > Email Templates > Magic Link: include `{{ .Token }}` so the email shows a 6-digit code (needed for the installed iPhone app)
- The built-in email sender is rate limited; add Resend as custom SMTP before launch
Bootstrap yourself as super admin afterward (replace the email), then confirm with a select:

    insert into public.admin_users (user_id, role)
    select id, 'super_admin' from auth.users where email = 'angel@finessemedia.pro';
    select * from public.admin_users;

## Live data sources (all free, no keys)

- Air temperature and wind: National Weather Service (api.weather.gov)
- Water temperature and tides: NOAA CO-OPS (api.tidesandcurrents.noaa.gov)
- Offshore sea temperature and waves: Open-Meteo Marine (marine-api.open-meteo.com)
- Spring river levels: USGS Water Services (waterservices.usgs.gov)
- Map tiles: CARTO basemaps over OpenStreetMap data (attribution shown on the map; check CARTO's terms before commercial scale)

If a source is down the app shows the last saved reading with its age, then falls back to a clear "not responding" message.

## Verify before launch

- Every station ID, gauge ID, coordinate and depth in `src/lib/seed.ts` and the SQL seed
- Emergency numbers in `src/lib/config.ts`
- App name (`APP_NAME` in `src/lib/config.ts`, `vite.config.ts` manifest, `index.html`)
- Terms of use and a safety disclaimer reviewed by a lawyer

## Next build phase

- Supabase auth (magic link) and swapping `src/lib/store.ts` reads and writes to the tables with the same shapes
- Certification upload to `cert-cards` and an admin review screen
- Business claim flow and partner offers
- Push notifications for join requests (installed PWA only on iPhone)
