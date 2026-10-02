import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PageHeader } from '../../components/PageHeader';
import { deleteBusiness, geocode, saveBusiness, updateBusinessPin, uploadBusinessLogo, type BusinessInput } from '../../lib/api';
import { BizBadge } from '../../components/BizBadge';
import { useAuth } from '../../lib/auth';
import { useBusinesses } from '../../lib/hooks';
import { invalidate } from '../../lib/query';
import { useLocal } from '../../lib/store';
import type { Business } from '../../lib/types';
import { fetchOsmCandidates, importCandidates, newCandidates, type OsmCandidate } from '../../lib/osm';

const KINDS: { id: Business['kind']; label: string }[] = [
  { id: 'shop', label: 'Dive shop' },
  { id: 'charter', label: 'Boat charter' },
  { id: 'resort', label: 'Dive resort' }
];

const pinIcon = L.divIcon({ className: '', html: '<span class="pin pin-circle is-active"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });

export default function ManageBusinesses() {
  const { isAdmin } = useAuth();
  const q = useBusinesses();
  const [editing, setEditing] = useState<Business | 'new' | null>(null);
  const [filter, setFilter] = useState('');
  const list = useMemo(() => {
    const t = filter.trim().toLowerCase();
    return (q.data ?? []).filter((b) => !t || `${b.name} ${b.area} ${b.kind}`.toLowerCase().includes(t));
  }, [q.data, filter]);

  if (!isAdmin) {
    return (
      <main className="page">
        <PageHeader title="Manage businesses" />
        <p className="muted">This screen is for the DiveCast team.</p>
      </main>
    );
  }
  if (editing) return <BusinessForm business={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />;

  const unverified = (q.data ?? []).filter((b) => !b.pinVerified).length;
  const fixable = (q.data ?? []).filter((b) => !b.pinVerified && b.address && /\d/.test(b.address));
  return (
    <main className="page">
      <PageHeader title="Manage businesses" sub={`${q.data?.length ?? 0} listings${unverified ? `, ${unverified} pins to check` : ''}`} action={<button type="button" className="btn btn-accent btn-sm" onClick={() => setEditing('new')}>Add</button>} />
      <label className="search glass">
        <input type="search" placeholder="Filter by name, town or type" aria-label="Filter businesses" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </label>
      <OsmImporter existing={q.data ?? []} />
      {fixable.length > 0 && <PinFixer list={fixable} />}
      {q.loading && <p className="muted">Loading...</p>}
      {q.error && <p className="form-error" role="alert">{q.error}</p>}
      {!q.loading && list.length === 0 && (
        <div className="empty card"><p><strong>No businesses yet.</strong></p><p className="small muted">Add dive shops, charters and resorts so they show on the map.</p></div>
      )}
      {list.map((b) => (
        <button key={b.id} type="button" className="biz-row" onClick={() => setEditing(b)}>
          <BizBadge business={b} size="sm" />
          <span className="stack-2 grow">
            <strong>{b.name}</strong>
            <span className="tiny muted">{KINDS.find((k) => k.id === b.kind)?.label} in {b.area}</span>
          </span>
          {b.pinVerified ? <span className="tag tag-ok">Pin checked</span> : <span className="tag tag-warn">Check pin</span>}
        </button>
      ))}
    </main>
  );
}

function OsmImporter({ existing }: { existing: Business[] }) {
  const [state, setState] = useState<'idle' | 'searching' | 'ready' | 'importing' | 'done'>('idle');
  const [found, setFound] = useState(0);
  const [fresh, setFresh] = useState<OsmCandidate[]>([]);
  const [error, setError] = useState('');
  const search = async () => {
    setState('searching');
    setError('');
    try {
      const all = await fetchOsmCandidates();
      setFound(all.length);
      setFresh(newCandidates(all, existing));
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
      setState('idle');
    }
  };
  const run = async () => {
    setState('importing');
    setError('');
    try {
      await importCandidates(fresh);
      invalidate('businesses');
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
      setState('ready');
    }
  };
  return (
    <div className="card stack-10">
      <p className="small"><strong>Import from OpenStreetMap</strong></p>
      <p className="tiny muted">Pulls every dive shop and dive center in Florida from the free OpenStreetMap database, with exact map locations. Anything you already have is skipped.</p>
      {state === 'searching' && <p className="small muted" role="status">Searching all of Florida... this can take up to a minute.</p>}
      {state === 'ready' && <p className="small" role="status">Found {found} dive businesses statewide. {fresh.length} are new to DiveCast.</p>}
      {state === 'ready' && fresh.length > 0 && (
        <ul className="osm-preview">
          {fresh.slice(0, 40).map((c) => <li key={c.osmId}><strong>{c.name}</strong> <span className="muted">{c.area}</span></li>)}
          {fresh.length > 40 && <li className="muted">and {fresh.length - 40} more</li>}
        </ul>
      )}
      {state === 'done' && <p className="small accent" role="status">Imported {fresh.length} listings.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {(state === 'idle' || state === 'searching') && <button type="button" className="btn btn-outline btn-sm" disabled={state === 'searching'} onClick={search}>{state === 'searching' ? 'Searching...' : 'Search Florida'}</button>}
      {state === 'ready' && fresh.length > 0 && <button type="button" className="btn btn-accent btn-sm" onClick={run}>Add {fresh.length} listings</button>}
      {state === 'importing' && <p className="small muted" role="status">Adding listings...</p>}
    </div>
  );
}

// Looks up each street address one at a time (the free geocoder allows about one request per second)
function PinFixer({ list }: { list: Business[] }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [fixed, setFixed] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const run = async () => {
    setRunning(true);
    setDone(0);
    setFixed(0);
    setMissed([]);
    for (const b of list) {
      try {
        const r = await geocode(b.address!);
        if (r) {
          await updateBusinessPin(b.id, r.lat, r.lng);
          setFixed((n) => n + 1);
        } else {
          setMissed((m) => [...m, b.name]);
        }
      } catch {
        setMissed((m) => [...m, b.name]);
      }
      setDone((n) => n + 1);
      await new Promise((res) => setTimeout(res, 1100));
    }
    invalidate('businesses');
    setRunning(false);
  };
  return (
    <div className="card stack-10">
      <p className="small"><strong>{list.length} listings have a street address</strong> and can have their pins placed automatically.</p>
      {running && <p className="small muted" role="status">Working... {done} of {list.length}</p>}
      {!running && done > 0 && <p className="small" role="status">Placed {fixed} pins.{missed.length ? ` Could not match: ${missed.join(', ')}. Open those and tap the map.` : ''}</p>}
      <button type="button" className="btn btn-accent btn-sm" disabled={running} onClick={run}>{running ? 'Fixing pins...' : 'Fix pins from addresses'}</button>
      <p className="tiny muted">Listings with only a town need their pin placed by hand: open the listing and tap the map.</p>
    </div>
  );
}

function PinPicker({ pos, onPick }: { pos: [number, number]; onPick: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return <Marker position={pos} icon={pinIcon} draggable eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onPick([ll.lat, ll.lng]); } }} />;
}

function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos, Math.max(map.getZoom(), 15));
    // Only when a new address is found, not on every pin drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos[0], pos[1]]);
  return null;
}

function BusinessForm({ business, onDone }: { business?: Business; onDone: () => void }) {
  const theme = useLocal((s) => s.theme);
  const [name, setName] = useState(business?.name ?? '');
  const [kind, setKind] = useState<Business['kind']>(business?.kind ?? 'shop');
  const [area, setArea] = useState(business?.area ?? '');
  const [address, setAddress] = useState(business?.address ?? '');
  const [phone, setPhone] = useState(business?.phone ?? '');
  const [website, setWebsite] = useState(business?.website ?? '');
  const [offer, setOffer] = useState(business?.offer ?? '');
  const [logoUrl, setLogoUrl] = useState<string | null>(business?.logoUrl ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pos, setPos] = useState<[number, number]>(business ? [business.lat, business.lng] : [27.6, -81.6]);
  const [placed, setPlaced] = useState(Boolean(business));
  const [fly, setFly] = useState<[number, number] | null>(business ? [business.lat, business.lng] : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState('');
  const cartoKey = import.meta.env.VITE_CARTO_KEY as string | undefined;
  const tiles = cartoKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/${theme === 'reef' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png?key=${cartoKey}`
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) return setError('Use a PNG, JPG, WebP or SVG logo.');
    if (f.size > 2 * 1024 * 1024) return setError('That logo is over 2 MB. Export a smaller version, around 512 by 512 pixels.');
    setError('');
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
  };

  const pick = (p: [number, number]) => {
    setPos(p);
    setPlaced(true);
  };

  const lookup = async () => {
    const qtext = [address, area, 'Florida'].filter(Boolean).join(', ');
    if (!address.trim() && !area.trim()) return setError('Enter the address or town first.');
    setError('');
    setFound('');
    try {
      const r = await geocode(qtext);
      if (!r) return setError('No match for that address. Tap the map to place the pin.');
      pick([r.lat, r.lng]);
      setFly([r.lat, r.lng]);
      setFound(r.label);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed.');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Enter the business name.');
    if (!area.trim()) return setError('Enter the town.');
    if (!placed) return setError('Place the pin: tap Find address or tap the map.');
    if (website && !/^https?:\/\//i.test(website.trim())) return setError('Website should start with https://');
    setBusy(true);
    setError('');
    try {
      const finalLogo = logoFile ? await uploadBusinessLogo(logoFile, name) : logoUrl;
      const input: BusinessInput = { name, kind, area, address, lat: pos[0], lng: pos[1], phone, website, offer, logoUrl: finalLogo };
      await saveBusiness(input, business?.id);
      invalidate('businesses');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!business || !window.confirm(`Delete ${business.name}? It will disappear from the map.`)) return;
    setBusy(true);
    try {
      await deleteBusiness(business.id);
      invalidate('businesses');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <header className="page-header">
        <button type="button" className="icon-btn" aria-label="Back to list" onClick={onDone}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="page-header-title"><h1 className="display-sm">{business ? 'Edit business' : 'Add business'}</h1></div>
      </header>
      <form className="form" onSubmit={submit} noValidate>
        <label>Business name<input type="text" value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <div className="logo-field">
          <BizBadge business={{ name: name || 'New business', kind, logoUrl: logoPreview ?? logoUrl ?? undefined }} size="lg" />
          <div className="stack-4 grow">
            <span className="small-strong">Logo</span>
            <span className="tiny muted">{logoPreview || logoUrl ? 'Shown on the map card and listings.' : 'No logo yet, so a monogram is shown. Square PNG with a transparent background works best.'}</span>
            <div className="row gap-8">
              <label className="btn btn-outline btn-sm file-btn">
                {logoPreview || logoUrl ? 'Replace' : 'Upload logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pickLogo} />
              </label>
              {(logoPreview || logoUrl) && <button type="button" className="btn btn-ghost btn-sm" onClick={removeLogo}>Remove</button>}
            </div>
          </div>
        </div>
        <label>Type
          <select value={kind} onChange={(e) => setKind(e.target.value as Business['kind'])}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
        </label>
        <label>Street address<input type="text" autoComplete="street-address" placeholder="105800 Overseas Hwy" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        <label>Town<input type="text" placeholder="Key Largo" value={area} onChange={(e) => setArea(e.target.value)} required /></label>
        <div className="stack-10">
          <div className="row-between">
            <span className="small-strong">Map pin</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={lookup}>Find address</button>
          </div>
          {found && <p className="tiny muted">Found: {found}. Drag the pin or tap the map to fine-tune it.</p>}
          {!found && <p className="tiny muted">Tap Find address, or tap the map to drop the pin. You can drag it to adjust.</p>}
          <div className="map-frame map-frame-sm">
            <MapContainer center={pos} zoom={business ? 15 : 6} style={{ height: '100%', width: '100%' }}>
              <TileLayer key={tiles} url={tiles} attribution={cartoKey ? '&copy; OpenStreetMap contributors &copy; CARTO' : '&copy; OpenStreetMap contributors'} />
              <PinPicker pos={pos} onPick={pick} />
              {fly && <FlyTo key={fly.join(',')} pos={fly} />}
            </MapContainer>
          </div>
        </div>
        <div className="form-2">
          <label>Phone (optional)<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>Website (optional)<input type="url" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
        </div>
        <label>Partner offer (optional)<input type="text" placeholder="10% off two-tank trips with code DIVECAST" value={offer} onChange={(e) => setOffer(e.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-accent" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
        {business && <button type="button" className="btn btn-ghost" disabled={busy} onClick={remove}>Delete listing</button>}
      </form>
    </main>
  );
}
