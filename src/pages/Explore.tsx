import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '../components/Icon';
import { useBusinesses, useSites } from '../lib/hooks';
import { useLocal } from '../lib/store';
import { KIND_LABEL } from '../lib/format';

type Layer = 'sites' | 'shop' | 'charter' | 'resort';
const LAYERS: { id: Layer; label: string; shape: string }[] = [
  { id: 'sites', label: 'Sites', shape: 'circle' },
  { id: 'shop', label: 'Shops', shape: 'square' },
  { id: 'charter', label: 'Charters', shape: 'triangle' },
  { id: 'resort', label: 'Resorts', shape: 'diamond' }
];

const icon = (shape: string, active = false) =>
  L.divIcon({ className: '', html: `<span class="pin pin-${shape}${active ? ' is-active' : ''}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });

export default function Explore() {
  const theme = useLocal((s) => s.theme);
  const { sites: SITES } = useSites();
  const BUSINESSES = useBusinesses().data ?? [];
  const [q, setQ] = useState('');
  const [on, setOn] = useState<Layer[]>(['sites', 'shop', 'charter', 'resort']);
  const [selected, setSelected] = useState<string | null>(null);

  const term = q.trim().toLowerCase();
  const sites = useMemo(
    () => (on.includes('sites') ? SITES.filter((s) => !term || `${s.name} ${s.area} ${s.kind}`.toLowerCase().includes(term)) : []),
    [on, term, SITES]
  );
  const biz = useMemo(
    () => BUSINESSES.filter((b) => on.includes(b.kind) && (!term || `${b.name} ${b.area} ${b.kind}`.toLowerCase().includes(term))),
    [on, term, BUSINESSES]
  );
  const tiles = theme !== 'reef'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const pick = SITES.find((s) => s.id === selected);

  const toggle = (id: Layer) => setOn((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <main className="page">
      <header className="stack-4">
        <h1 className="display-lg">Explore</h1>
        <p className="muted">Springs, reefs and wrecks across Florida</p>
      </header>
      <label className="search glass">
        <Icon name="search" size={20} />
        <input type="search" placeholder="Search sites, shops, charters" aria-label="Search sites, shops and charters" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="chip-row" role="group" aria-label="Map layers">
        {LAYERS.map((l) => (
          <button key={l.id} type="button" className={`chip chip-toggle${on.includes(l.id) ? ' is-on' : ''}`} aria-pressed={on.includes(l.id)} onClick={() => toggle(l.id)}>
            <span className={`legend legend-${l.shape}`} aria-hidden="true" />
            {l.label}
          </button>
        ))}
      </div>

      <div className="map-frame">
        <MapContainer center={[27.6, -81.6]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} attributionControl ref={(m) => { m?.attributionControl.setPrefix(false); }}>
          <TileLayer url={tiles} attribution='&copy; OpenStreetMap contributors &copy; CARTO' />
          {sites.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={icon('circle', s.id === selected)} eventHandlers={{ click: () => setSelected(s.id) }} title={s.name} />
          ))}
          {biz.map((b) => (
            <Marker key={b.id} position={[b.lat, b.lng]} icon={icon(b.kind === 'shop' ? 'square' : b.kind === 'charter' ? 'triangle' : 'diamond')} title={b.name} />
          ))}
        </MapContainer>
      </div>

      {pick && (
        <Link to={`/site/${pick.slug}`} className="featured glass">
          <span className="featured-title">{pick.name}</span>
          <span className="small muted">{KIND_LABEL[pick.kind]} in {pick.area}, max {pick.maxDepthFt} ft</span>
          <span className="btn btn-light">View conditions</span>
        </Link>
      )}

      <section className="stack-10">
        <h2 className="section-title">{sites.length} dive {sites.length === 1 ? 'site' : 'sites'}</h2>
        {sites.length === 0 && <p className="muted small">No sites match that search. Try a town like Key Largo or a type like spring.</p>}
        <div className="grid-2">
          {sites.map((s) => (
            <Link key={s.id} to={`/site/${s.slug}`} className="site-card glass">
              <span className="site-card-name">{s.name}</span>
              <span className="tiny muted">{KIND_LABEL[s.kind]}, {s.area}</span>
              <span className="tiny mono">{s.maxDepthFt} ft max</span>
            </Link>
          ))}
        </div>
      </section>

      {biz.length === 0 && (
        <section className="card stack-10">
          <h2 className="section-title">Shops, charters and resorts</h2>
          <p className="small muted">Dive shops, charters and resorts will appear here as they are added. Own a dive business? Listings are free.</p>
        </section>
      )}
      {biz.length > 0 && (
        <section className="stack-10">
          <h2 className="section-title">Shops, charters and resorts</h2>
          {biz.map((b) => (
            <div key={b.id} className={`biz glass${b.offer ? ' has-offer' : ''}`}>
              <div>
                <strong>{b.name}</strong>
                <p className="tiny muted">{b.kind === 'shop' ? 'Dive shop' : b.kind === 'charter' ? 'Boat charter' : 'Dive resort'} in {b.area}{b.isDemo ? ', example listing' : ''}</p>
                {b.offer && <p className="small offer">{b.offer}</p>}
              </div>
              {b.claimed ? <span className="tag tag-ok">Claimed</span> : <span className="tag">Unclaimed</span>}
            </div>
          ))}
          <p className="tiny muted">Own a dive business? Claiming a listing is free and lets you post offers for divers.</p>
        </section>
      )}
    </main>
  );
}
