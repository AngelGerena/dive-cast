import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '../components/Icon';
import { useBusinesses, useSites } from '../lib/hooks';
import { useLocal } from '../lib/store';
import { KIND_LABEL } from '../lib/format';
import { sitePhoto } from '../lib/photos';
import type { Business } from '../lib/types';

type Layer = 'sites' | 'shop' | 'charter' | 'resort';
const LAYERS: { id: Layer; label: string; shape: string }[] = [
  { id: 'sites', label: 'Sites', shape: 'circle' },
  { id: 'shop', label: 'Shops', shape: 'square' },
  { id: 'charter', label: 'Charters', shape: 'triangle' },
  { id: 'resort', label: 'Resorts', shape: 'diamond' }
];

const SHAPE: Record<Business['kind'], string> = { shop: 'square', charter: 'triangle', resort: 'diamond' };
const BIZ_LABEL: Record<Business['kind'], string> = { shop: 'Dive shop', charter: 'Boat charter', resort: 'Dive resort' };

type Selection = { type: 'site' | 'biz'; id: string } | null;

const icon = (shape: string, active = false) =>
  L.divIcon({ className: '', html: `<span class="pin pin-${shape}${active ? ' is-active' : ''}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });

const directionsUrl = (b: Business) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.address && /\d/.test(b.address) ? b.address : `${b.lat},${b.lng}`)}`;

// Tapping empty map clears the selected pin
function ClearOnMapTap({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: onClear });
  return null;
}

function BizLinks({ b }: { b: Business }) {
  return (
    <div className="row biz-links">
      {b.phone && <a className="link" href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}>Call</a>}
      {b.website && <a className="link" href={b.website} target="_blank" rel="noreferrer">Website</a>}
      <a className="link" href={directionsUrl(b)} target="_blank" rel="noreferrer">Directions</a>
    </div>
  );
}

export default function Explore() {
  const theme = useLocal((s) => s.theme);
  const { sites: SITES } = useSites();
  const BUSINESSES = useBusinesses().data ?? [];
  const [q, setQ] = useState('');
  const [on, setOn] = useState<Layer[]>(['sites', 'shop', 'charter', 'resort']);
  const [selected, setSelected] = useState<Selection>(null);

  const term = q.trim().toLowerCase();
  const sites = useMemo(
    () => (on.includes('sites') ? SITES.filter((s) => !term || `${s.name} ${s.area} ${s.kind}`.toLowerCase().includes(term)) : []),
    [on, term, SITES]
  );
  const biz = useMemo(
    () => BUSINESSES.filter((b) => on.includes(b.kind) && (!term || `${b.name} ${b.area} ${b.kind}`.toLowerCase().includes(term))),
    [on, term, BUSINESSES]
  );
  // CARTO basemaps need a free key (VITE_CARTO_KEY). Without one, fall back to standard OpenStreetMap tiles.
  const cartoKey = import.meta.env.VITE_CARTO_KEY as string | undefined;
  const tiles = cartoKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/${theme === 'reef' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png?key=${cartoKey}`
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = cartoKey ? '&copy; OpenStreetMap contributors &copy; CARTO' : '&copy; OpenStreetMap contributors';

  const pickSite = selected?.type === 'site' ? SITES.find((s) => s.id === selected.id) : undefined;
  const pickBiz = selected?.type === 'biz' ? BUSINESSES.find((b) => b.id === selected.id) : undefined;
  const isOn = (type: 'site' | 'biz', id: string) => selected?.type === type && selected.id === id;

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
            {on.includes(l.id) ? <Icon name="check" size={15} stroke={2.6} /> : <span className={`legend legend-${l.shape}`} aria-hidden="true" />}
            {l.label}
          </button>
        ))}
      </div>

      <div className="map-frame">
        <MapContainer center={[27.6, -81.6]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} attributionControl ref={(m) => { m?.attributionControl.setPrefix(false); }}>
          <TileLayer key={tiles} url={tiles} attribution={attribution} />
          <ClearOnMapTap onClear={() => setSelected(null)} />
          {sites.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={icon('circle', isOn('site', s.id))}
              zIndexOffset={isOn('site', s.id) ? 1000 : 0}
              eventHandlers={{ click: () => setSelected({ type: 'site', id: s.id }) }}
              title={s.name}
            />
          ))}
          {biz.map((b) => (
            <Marker
              key={b.id}
              position={[b.lat, b.lng]}
              icon={icon(SHAPE[b.kind], isOn('biz', b.id))}
              zIndexOffset={isOn('biz', b.id) ? 1000 : 0}
              eventHandlers={{ click: () => setSelected({ type: 'biz', id: b.id }) }}
              title={b.name}
            />
          ))}
        </MapContainer>
      </div>

      {pickSite && (
        <div className="featured glass">
          <button type="button" className="icon-btn featured-close" aria-label="Close" onClick={() => setSelected(null)}><Icon name="close" size={18} /></button>
          {sitePhoto(pickSite) && <img className="featured-photo" src={sitePhoto(pickSite)!.thumb} alt="" loading="lazy" />}
          <span className="featured-title">{pickSite.name}</span>
          <span className="small muted">{KIND_LABEL[pickSite.kind]} in {pickSite.area}, max {pickSite.maxDepthFt} ft</span>
          <Link to={`/site/${pickSite.slug}`} className="btn btn-light">View conditions</Link>
        </div>
      )}

      {pickBiz && (
        <div className={`featured glass${pickBiz.offer ? ' has-offer' : ''}`} role="region" aria-label={pickBiz.name}>
          <button type="button" className="icon-btn featured-close" aria-label="Close" onClick={() => setSelected(null)}><Icon name="close" size={18} /></button>
          <span className="featured-kind">
            <span className={`legend legend-${SHAPE[pickBiz.kind]}`} aria-hidden="true" />
            {BIZ_LABEL[pickBiz.kind]}
            {pickBiz.claimed ? <span className="tag tag-ok">Claimed</span> : <span className="tag">Unclaimed</span>}
          </span>
          <span className="featured-title">{pickBiz.name}</span>
          <span className="small muted">{pickBiz.address && pickBiz.address !== pickBiz.area ? pickBiz.address : `${pickBiz.area}, Florida`}</span>
          {pickBiz.phone && <span className="small">{pickBiz.phone}</span>}
          {pickBiz.offer && <p className="small offer">{pickBiz.offer}</p>}
          <BizLinks b={pickBiz} />
          {pickBiz.source === 'osm' && <span className="osm-credit">Listing &copy; OpenStreetMap contributors, ODbL.</span>}
        </div>
      )}

      <section className="stack-10">
        <h2 className="section-title">{sites.length} dive {sites.length === 1 ? 'site' : 'sites'}</h2>
        {sites.length === 0 && <p className="muted small">No sites match that search. Try a town like Key Largo or a type like spring.</p>}
        <div className="grid-2">
          {sites.map((s) => (
            <Link key={s.id} to={`/site/${s.slug}`} className="site-card glass">
              {sitePhoto(s) ? (
                <img className="site-card-photo" src={sitePhoto(s)!.thumb} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className={`site-card-photo site-card-empty kind-${s.kind}`} aria-hidden="true">{KIND_LABEL[s.kind]}</span>
              )}
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
          <h2 className="section-title">{biz.length} shops, charters and resorts</h2>
          {biz.map((b) => (
            <div key={b.id} className={`biz glass${b.offer ? ' has-offer' : ''}`}>
              <div className="stack-4">
                <strong>{b.name}</strong>
                <p className="tiny muted">{BIZ_LABEL[b.kind]} in {b.area}</p>
                {b.address && b.address !== b.area && <p className="tiny muted">{b.address}</p>}
                {b.offer && <p className="small offer">{b.offer}</p>}
                <BizLinks b={b} />
              </div>
              {b.claimed ? <span className="tag tag-ok">Claimed</span> : <span className="tag">Unclaimed</span>}
            </div>
          ))}
          <p className="tiny muted">Own a dive business? Claiming a listing is free and lets you post offers for divers.</p>
          {biz.some((b) => b.source === 'osm') && <p className="osm-credit">Some listings &copy; OpenStreetMap contributors, ODbL.</p>}
        </section>
      )}
    </main>
  );
}
