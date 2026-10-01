-- DiveCast 004: business address and pin check, plus a starter list of real Florida dive businesses.
-- Pins are approximate (pin_verified = false). Open each one in Manage businesses, tap Find address, then Save.

alter table public.businesses add column if not exists address text;
alter table public.businesses add column if not exists pin_verified boolean not null default false;

insert into public.businesses (name, kind, area, address, lat, lng, phone, website, pin_verified, is_demo)
select v.name, v.kind, v.area, v.address, v.lat, v.lng, v.phone, v.website, false, false
from (values
  -- Blue Heron Bridge, Peanut Island, Breakers Reef
  ('Force-E Scuba Centers', 'shop', 'Riviera Beach', 'Blue Heron Blvd, Riviera Beach, FL 33404', 26.7846, -80.0565, null, 'https://www.force-e.com', null),
  ('Pura Vida Divers', 'shop', 'Singer Island', 'Blue Heron Blvd, Singer Island, FL 33404', 26.7849, -80.0383, null, 'https://www.puravidadivers.com', null),
  ('Narcosis Dive Charters', 'charter', 'Riviera Beach', 'Riviera Beach, FL 33404', 26.7790, -80.0520, null, null, null),
  -- Spiegel Grove, Molasses Reef
  ('Horizon Divers', 'charter', 'Key Largo', '105800 Overseas Hwy, Key Largo, FL 33037', 25.1700, -80.3840, null, null, null),
  ('Amy Slate''s Amoray Dive Resort', 'resort', 'Key Largo', '104250 Overseas Hwy, Key Largo, FL 33037', 25.1450, -80.3960, '305-451-3595', 'https://www.amoray.com', null),
  ('Rainbow Reef Dive Center', 'charter', 'Key Largo', '100800 Overseas Hwy, Key Largo, FL 33037', 25.1000, -80.4370, null, null, null),
  ('Ocean Divers', 'charter', 'Key Largo', '522 Caribbean Dr, Key Largo, FL 33037', 25.0950, -80.4320, null, null, null),
  ('Divers Direct', 'shop', 'Key Largo', '99621 Overseas Hwy, Key Largo, FL 33037', 25.0870, -80.4430, null, 'https://www.diversdirect.com', null),
  -- Ginnie Springs
  ('Ginnie Springs Outdoors', 'resort', 'High Springs', '7300 NE Ginnie Springs Rd, High Springs, FL 32643', 29.8358, -82.6990, '386-454-7188', 'https://www.ginniespringsoutdoors.com', null),
  ('Extreme Exposure', 'shop', 'High Springs', '18481 High Springs Main St, High Springs, FL 32643', 29.8270, -82.5970, '386-454-8158', 'https://www.extreme-exposure.com', null),
  -- Devil's Den, Blue Grotto
  ('Devil''s Den Prehistoric Spring', 'resort', 'Williston', '5390 NE 180th Ave, Williston, FL 32696', 29.4087, -82.4764, '352-528-3344', null, null),
  ('Blue Grotto Dive Resort', 'resort', 'Williston', '3852 NE 172nd Ct, Williston, FL 32696', 29.3747, -82.4815, '352-528-5770', null, null),
  -- Rainbow River
  ('Crystal River Watersports', 'charter', 'Crystal River', '2380 NW Highway 19, Crystal River, FL 34428', 28.9180, -82.6400, null, null, null)
) as v(name, kind, area, address, lat, lng, phone, website, offer)
where not exists (select 1 from public.businesses b where b.name = v.name and b.area = v.area);

notify pgrst, 'reload schema';
