import { supabase } from './supabase';
import type { Business } from './types';

// Statewide import of dive businesses from OpenStreetMap (data (c) OpenStreetMap contributors, ODbL).
// Runs in the browser against the public Overpass API, only from the admin screen.

const OVERPASS = 'https://overpass-api.de/api/interpreter';

const QUERY = `[out:json][timeout:90];
area["ISO3166-2"="US-FL"][admin_level=4]->.fl;
(
  nwr["shop"="scuba_diving"](area.fl);
  nwr["amenity"="dive_centre"](area.fl);
  nwr["sport"="scuba_diving"]["leisure"](area.fl);
  nwr["sport"="scuba_diving"]["club"](area.fl);
  nwr["sport"="scuba_diving"]["tourism"](area.fl);
  nwr["sport"="scuba_diving"]["shop"](area.fl);
);
out center tags;`;

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OsmCandidate {
  osmId: string;
  name: string;
  kind: Business['kind'];
  area: string;
  address?: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
}

function kindOf(t: Record<string, string>): Business['kind'] {
  if (t.tourism && ['hotel', 'motel', 'resort', 'guest_house', 'camp_site', 'chalet'].includes(t.tourism)) return 'resort';
  const text = `${t.name ?? ''} ${t.description ?? ''}`.toLowerCase();
  if (/charter|boat|excursion/.test(text)) return 'charter';
  if (t.amenity === 'dive_centre') return 'charter';
  return 'shop';
}

export async function fetchOsmCandidates(): Promise<OsmCandidate[]> {
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(QUERY)}`
  });
  if (!res.ok) throw new Error(`OpenStreetMap is busy (${res.status}). Try again in a minute.`);
  const json = (await res.json()) as { elements: OsmElement[] };
  const out: OsmCandidate[] = [];
  for (const e of json.elements ?? []) {
    const t = e.tags ?? {};
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (!t.name || lat == null || lng == null) continue;
    const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
    const city = t['addr:city'] ?? t['addr:place'] ?? '';
    const address = [street, city, t['addr:postcode'] ? `FL ${t['addr:postcode']}` : city ? 'FL' : ''].filter(Boolean).join(', ');
    out.push({
      osmId: `${e.type}/${e.id}`,
      name: t.name.trim(),
      kind: kindOf(t),
      area: city || 'Florida',
      address: address || undefined,
      lat, lng,
      phone: t.phone ?? t['contact:phone'],
      website: t.website ?? t['contact:website']
    });
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Skip anything already imported, or a same-name listing within 3 km of one we already have.
export function newCandidates(found: OsmCandidate[], existing: (Business & { osmId?: string })[]) {
  return found.filter((c) => !existing.some((b) =>
    b.osmId === c.osmId || (norm(b.name) === norm(c.name) && km(b.lat, b.lng, c.lat, c.lng) < 3)
  ));
}

export async function importCandidates(list: OsmCandidate[]) {
  for (let i = 0; i < list.length; i += 50) {
    const rows = list.slice(i, i + 50).map((c) => ({
      name: c.name, kind: c.kind, area: c.area, address: c.address ?? null, lat: c.lat, lng: c.lng,
      phone: c.phone ?? null, website: c.website ?? null, pin_verified: true, is_demo: false, source: 'osm', osm_id: c.osmId
    }));
    const { error } = await supabase.from('businesses').upsert(rows, { onConflict: 'osm_id', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
}
