import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { TideChart } from '../components/TideChart';
import { ThermalProfile } from '../components/ThermalProfile';
import { RiverCard } from './RiverCard';
import { useSiteConditions } from '../lib/conditions';
import { useBusinesses, useReports, useSites } from '../lib/hooks';
import { toggleSaved, useLocal } from '../lib/store';
import { KIND_LABEL, milesBetween, relTime } from '../lib/format';
import type { Site } from '../lib/types';
import { sitePhoto } from '../lib/photos';

export default function SiteDetail() {
  const { slug } = useParams();
  const { bySlug, loading } = useSites();
  const site = bySlug(slug);
  if (loading) return <main className="page"><p className="muted">Loading site...</p></main>;
  if (!site) {
    return (
      <main className="page">
        <PageHeader title="Site not found" />
        <p className="muted">That dive site is not in the directory yet.</p>
        <Link className="btn btn-accent" to="/explore">Browse dive sites</Link>
      </main>
    );
  }
  return <SiteView site={site} />;
}

function SiteView({ site }: { site: Site }) {
  const c = useSiteConditions(site);
  const saved = useLocal((s) => s.savedSiteSlugs.includes(site.slug));
  const reports = useReports(site.id).data ?? [];
  const businesses = useBusinesses().data ?? [];
  const recent = reports.filter((r) => Date.now() - new Date(r.reportedAt).getTime() < 72 * 3600_000);
  const latestVis = reports.find((r) => r.visibilityFt);
  const latestCurrent = reports.find((r) => r.current);
  const nearby = businesses.filter((b) => milesBetween(site.lat, site.lng, b.lat, b.lng) < 30);
  const surfaceF = c.water.status === 'ok' ? c.water.data.tempF : undefined;
  const photo = sitePhoto(site);

  return (
    <main className="page">
      <PageHeader
        action={
          <button type="button" className={`icon-btn${saved ? ' is-on' : ''}`} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save site'} onClick={() => toggleSaved(site.slug)}>
            <Icon name="bookmark" />
          </button>
        }
      />
      {photo && (
        <figure className="site-photo">
          <img src={photo.full} alt={`${site.name}, ${site.area}`} loading="eager" decoding="async" />
          {photo.credit && <figcaption>Photo: {photo.credit}</figcaption>}
        </figure>
      )}
      <section className="stack-10">
        <p className="accent small-strong">{KIND_LABEL[site.kind]} in {site.area}, Florida</p>
        <h1 className="display-lg">{site.name}</h1>
        <p className="lede">{site.summary}</p>
      </section>

      <section className="facts">
        <div><span className="fact-value">{site.minDepthFt ? `${site.minDepthFt}-${site.maxDepthFt}` : site.maxDepthFt} ft</span><span className="fact-label">{site.minDepthFt ? 'Depth range' : 'Max depth'}</span></div>
        <div><span className="fact-value">{site.access === 'boat' ? 'Boat' : 'Shore'}</span><span className="fact-label">Access</span></div>
        <div><span className="fact-value">{site.minCert.replace('Advanced Open Water', 'AOW').replace('Open Water', 'OW')}</span><span className="fact-label">Suggested cert</span></div>
      </section>

      <h2 className="section-title">Conditions now</h2>
      <section className="tiles-2">
        <div className="tile">
          <span className="tile-label"><Icon name="thermo" size={16} /> {site.waterSource.type === 'spring' ? 'Spring water' : 'Surface water'}</span>
          <span className="tile-value">{c.water.status === 'ok' ? `${c.water.data.tempF.toFixed(site.waterSource.type === 'coops' ? 1 : 0)}°F` : c.water.status === 'loading' ? '--' : 'n/a'}</span>
          <span className="tile-foot">
            {c.water.status === 'ok'
              ? c.water.data.kind === 'spring' ? 'Steady all year' : c.water.data.kind === 'model' ? 'Marine forecast model' : `${c.water.data.source}, ${relTime(new Date(c.water.data.observedAt).toISOString())}`
              : c.water.status === 'unavailable' ? 'Source not responding' : 'Loading'}
          </span>
        </div>
        <div className="tile">
          <span className="tile-label"><Icon name="wind" size={16} /> Air</span>
          <span className="tile-value">{c.air.status === 'ok' ? `${c.air.data.tempF}°F` : '--'}</span>
          <span className="tile-foot">{c.air.status === 'ok' ? `${c.air.data.summary}, wind ${c.air.data.wind}` : c.air.status === 'loading' ? 'Loading' : 'Weather not available right now'}</span>
        </div>
        <div className="tile">
          <span className="tile-label"><Icon name="eye" size={16} /> Visibility</span>
          <span className="tile-value">{latestVis ? `${latestVis.visibilityFt} ft` : '--'}</span>
          <span className="tile-foot">{latestVis ? `${latestVis.diverName}, ${relTime(latestVis.reportedAt)}` : 'No diver reports yet'}</span>
        </div>
        {site.waterSource.type === 'spring' ? (
          <div className="tile">
            <span className="tile-label"><Icon name="waves" size={16} /> Flow</span>
            <span className="tile-value">{latestCurrent?.current ? cap(latestCurrent.current) : '--'}</span>
            <span className="tile-foot">{latestCurrent ? relTime(latestCurrent.reportedAt) : 'No diver reports yet'}</span>
          </div>
        ) : (
          <div className="tile">
            <span className="tile-label"><Icon name="waves" size={16} /> Seas and current</span>
            <span className="tile-value">{c.marine.status === 'ok' && c.marine.data.waveFt != null ? `${c.marine.data.waveFt} ft` : '--'}</span>
            <span className="tile-foot">{latestCurrent?.current ? `Current ${latestCurrent.current}, ${relTime(latestCurrent.reportedAt)}` : 'Wave height from marine forecast'}</span>
          </div>
        )}
      </section>

      {site.tideStation && (
        <section className="card">
          {c.tides.status === 'ok' ? <TideChart tides={c.tides.data} /> : <p className="muted small">{c.tides.status === 'loading' ? 'Loading tide predictions...' : 'Tide predictions are not available right now.'}</p>}
          <p className="tiny muted">NOAA predictions, {site.tideStation.label}</p>
        </section>
      )}
      {site.usgsGauge && <RiverCard result={c.river} />}

      {site.waterSource.type !== 'spring' && (
        <>
          <div className="row-between">
            <h2 className="section-title">Temperature by depth</h2>
            <span className="tiny muted mono nowrap">Last 72 h</span>
          </div>
          <ThermalProfile reports={recent} surfaceF={surfaceF} siteSlug={site.slug} maxDepth={site.maxDepthFt} />
        </>
      )}

      {reports.length > 0 && (
        <section className="stack-10">
          <h2 className="section-title">Recent reports</h2>
          {reports.slice(0, 4).map((r) => (
            <div key={r.id} className="report">
              <div className="row-between"><strong>{r.diverName}</strong><span className="tiny muted">{relTime(r.reportedAt)}</span></div>
              <p className="small muted">
                {[r.depthFt && r.tempF ? `${r.tempF}°F at ${r.depthFt} ft` : null, r.visibilityFt ? `${r.visibilityFt} ft visibility` : null, r.current ? `${r.current} current` : null].filter(Boolean).join(', ')}
              </p>
              {r.note && <p className="small">{r.note}</p>}
            </div>
          ))}
        </section>
      )}

      {nearby.length > 0 && (
        <section className="stack-10">
          <h2 className="section-title">Nearby shops, charters and resorts</h2>
          {nearby.map((b) => (
            <div key={b.id} className={`biz glass${b.offer ? ' has-offer' : ''}`}>
              <div>
                <strong>{b.name}</strong>
                <p className="tiny muted">{cap(b.kind)} in {b.area}{b.isDemo ? ', example listing' : ''}</p>
                {b.offer && <p className="small offer">{b.offer}</p>}
              </div>
              {!b.claimed && <span className="tag">Unclaimed</span>}
            </div>
          ))}
        </section>
      )}

      <section className="actions-2">
        <Link className="btn btn-accent" to={`/log/new?site=${site.slug}`}>Log a dive here</Link>
        <Link className="btn btn-outline" to={`/dives/new?site=${site.slug}`}>Find a buddy</Link>
      </section>
      <p className="tiny muted disclaimer">Conditions are informational and can change quickly. Confirm with your dive operator and dive within your training.</p>
    </main>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
