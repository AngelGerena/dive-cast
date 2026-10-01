-- DiveCast 005: statewide sweep of Florida dive shops, charters and resorts.
-- Pins are approximate (pin_verified = false). In Manage businesses, tap "Fix pins from addresses".
-- Some sources are a few years old: confirm each business is still open before promoting it.

insert into public.businesses (name, kind, area, address, lat, lng, phone, website, pin_verified, is_demo)
select v.name, v.kind, v.area, v.address, v.lat, v.lng, v.phone, v.website, false, false
from (values
  -- Panhandle: Pensacola and Gulf Breeze (USS Oriskany)
  ('Dive Pros', 'shop', 'Pensacola', 'Pensacola, FL', 30.4710, -87.2410, null, null),
  ('MBT Divers', 'shop', 'Pensacola', 'Pensacola, FL', 30.4300, -87.2600, '850-455-7702', null),
  ('Scuba Shack and Wet Dream Charters', 'charter', 'Pensacola', 'Downtown waterfront, Pensacola, FL', 30.4060, -87.2120, null, null),
  ('Bay Breeze Dive Center', 'charter', 'Gulf Breeze', 'Gulf Breeze, FL', 30.3570, -87.1640, null, null),
  ('Niuhi Dive Charters', 'charter', 'Pensacola', 'Pensacola, FL', 30.4040, -87.2140, null, null),
  ('H2O Below Dive Charters', 'charter', 'Pensacola', 'Pensacola, FL', 30.4050, -87.2160, null, null),
  -- Panhandle: Destin, Fort Walton Beach, 30A, Panama City Beach
  ('Scuba Tech', 'charter', 'Destin', 'Destin, FL 32541', 30.3930, -86.4960, null, null),
  ('Emerald Coast Scuba', 'shop', 'Destin', 'Destin, FL 32541', 30.3940, -86.4800, null, null),
  ('Discovery Dive World', 'charter', 'Destin', 'Destin, FL 32541', 30.3900, -86.4400, null, null),
  ('The Scuba Shop', 'shop', 'Fort Walton Beach', 'Fort Walton Beach, FL 32548', 30.4060, -86.6190, null, null),
  ('Sea Pal Dive Charters', 'charter', 'Fort Walton Beach', 'Fort Walton Beach, FL', 30.4000, -86.6100, null, null),
  ('30A Dive', 'charter', 'Santa Rosa Beach', 'Santa Rosa Beach, FL 32459', 30.3700, -86.2300, null, null),
  ('Panama City Dive Center', 'charter', 'Panama City Beach', 'Panama City Beach, FL 32408', 30.1770, -85.8050, null, null),
  ('Panama City Diving', 'charter', 'Panama City Beach', 'Panama City Beach, FL 32408', 30.1760, -85.8100, null, null),
  ('Dive Locker', 'shop', 'Panama City Beach', 'Panama City Beach, FL 32408', 30.1800, -85.8000, null, null),
  ('SRS Adventures', 'charter', 'Panama City Beach', '19211 Panama City Beach Pkwy, Panama City Beach, FL 32413', 30.2300, -85.9100, null, null),
  -- Northeast
  ('Atlantic Pro Divers', 'shop', 'Jacksonville Beach', 'Jacksonville Beach, FL', 30.2860, -81.4020, null, null),
  -- Central Florida
  ('Divers Direct Orlando', 'shop', 'Orlando', '8200 S Orange Blossom Trl, Orlando, FL 32809', 28.4480, -81.4010, '407-363-2883', 'https://www.diversdirect.com'),
  ('The Dive Place', 'shop', 'Orlando', '7152 Memory Ln, Orlando, FL 32807', 28.5280, -81.3120, null, null),
  ('Elite Scuba Ormond Beach', 'shop', 'Ormond Beach', 'Ormond Beach, FL', 29.2860, -81.0560, null, null),
  ('Sea Level Scuba', 'shop', 'Melbourne', 'Wickham Rd, Melbourne, FL 32934', 28.1500, -80.6850, null, null),
  -- Gulf coast and Nature Coast
  ('Divers Supply', 'shop', 'Tampa', 'Gunn Hwy, Tampa, FL', 28.0820, -82.5600, null, null),
  ('Calypso Divers', 'shop', 'Tampa', 'Bearss Ave near I-275, Tampa, FL', 28.1220, -82.4580, null, null),
  ('American Pro Diving Center', 'charter', 'Crystal River', '821 SE Hwy 19, Crystal River, FL 34429', 28.8930, -82.5900, '352-563-0041', null),
  ('Bird''s Underwater', 'charter', 'Crystal River', '320 NW Hwy 19, Crystal River, FL 34428', 28.9070, -82.5960, '352-563-2763', null),
  ('Crystal Lodge Dive Center', 'shop', 'Crystal River', 'Crystal River, FL', 28.8950, -82.5950, null, null),
  -- Palm Beach and Broward
  ('Jupiter Dive Center', 'charter', 'Jupiter', 'Jupiter, FL', 26.9460, -80.0730, null, null),
  ('Scuba Works', 'shop', 'Jupiter', 'Shops of Jupiter Plaza, Jupiter, FL', 26.9300, -80.0950, null, null),
  ('Emerald Charters', 'charter', 'Jupiter', 'Jupiter, FL', 26.9450, -80.0750, null, null),
  ('South Florida Dive Headquarters', 'charter', 'Pompano Beach', 'Pompano Beach, FL', 26.2350, -80.0900, null, null),
  ('Scubatyme', 'charter', 'Pompano Beach', 'Pompano Beach, FL', 26.2300, -80.0950, null, null),
  ('Gold Coast Scuba', 'shop', 'Lauderdale-by-the-Sea', 'Lauderdale-by-the-Sea, FL', 26.1920, -80.0960, null, null),
  -- Miami
  ('Diver''s Paradise', 'charter', 'Key Biscayne', 'Crandon Park, Key Biscayne, FL', 25.7180, -80.1570, null, null),
  ('Grove Scuba', 'shop', 'Coconut Grove', 'Coconut Grove, Miami, FL', 25.7270, -80.2410, null, null),
  -- Florida Keys
  ('Captain Slate''s Atlantis Dive Center', 'charter', 'Key Largo', '51 Garden Cove Dr, Key Largo, FL 33037', 25.1720, -80.3730, null, null),
  ('Islamorada Dive Center', 'charter', 'Islamorada', '84001 Overseas Hwy, Islamorada, FL 33036', 24.9440, -80.6110, null, null),
  ('Deep Sea Scuba', 'charter', 'Islamorada', 'Islamorada, FL 33036', 24.9300, -80.6300, null, null),
  ('Hall''s Diving Center', 'charter', 'Marathon', '5050 Overseas Hwy, Marathon, FL 33050', 24.7180, -81.0640, null, null),
  ('Better Than Most Scuba', 'charter', 'Marathon', 'Marathon, FL 33050', 24.7150, -81.0800, null, null),
  ('Looe Key Reef Resort and Dive Center', 'resort', 'Ramrod Key', 'Ramrod Key, FL 33042', 24.6560, -81.4100, null, null),
  ('Southpoint Divers', 'charter', 'Key West', '606 Front St, Key West, FL 33040', 24.5600, -81.8060, null, null),
  ('Finz Dive Center', 'charter', 'Key West', 'Key West, FL 33040', 24.5620, -81.7900, null, null)
) as v(name, kind, area, address, lat, lng, phone, website)
where not exists (select 1 from public.businesses b where b.name = v.name and b.area = v.area);

notify pgrst, 'reload schema';
