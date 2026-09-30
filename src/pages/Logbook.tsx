import { Link } from 'react-router-dom';
import { DepthProfile } from '../components/DepthProfile';
import { useMyDives, useSites } from '../lib/hooks';
import { dateLabel } from '../lib/format';

export default function Logbook() {
  const q = useMyDives();
  const dives = q.data ?? [];
  const { sites: SITES } = useSites();
  const year = new Date().getFullYear();
  const thisYear = dives.filter((d) => d.date.startsWith(String(year)));
  const hours = Math.round(thisYear.reduce((a, d) => a + d.bottomMin, 0) / 60);
  const sites = new Set(thisYear.map((d) => d.siteId)).size;
  const deepest = thisYear.reduce((a, d) => Math.max(a, d.maxDepthFt), 0);
  const [latest, ...rest] = dives;
  const latestSite = latest && SITES.find((s) => s.id === latest.siteId);

  return (
    <main className="page pelagic">
      <header className="row-between">
        <h1 className="display-md">Logbook</h1>
        <Link to="/log/new" className="btn btn-accent btn-sm">Log a dive</Link>
      </header>
      <section className="stack-10">
        <div className="big-count">
          <span className="big-num">{thisYear.length}</span>
          <span className="big-label">{thisYear.length === 1 ? 'dive' : 'dives'} in {year}</span>
        </div>
        <div className="row gap-22 small muted">
          <span><strong className="text">{hours} h</strong> underwater</span>
          <span><strong className="text">{sites}</strong> sites</span>
          <span><strong className="text">{deepest} ft</strong> deepest</span>
        </div>
      </section>

      {q.loading && <p className="muted">Loading your dives...</p>}
      {q.error && <p className="form-error" role="alert">Could not load your logbook. {q.error}</p>}
      {!q.loading && !q.error && !latest && (
        <div className="empty card">
          <p><strong>Your logbook is empty.</strong></p>
          <p className="small muted">Log your first dive and it shows up here with its profile and stats.</p>
          <Link className="btn btn-accent" to="/log/new">Log a dive</Link>
        </div>
      )}

      {latest && latestSite && (
        <article className="log-latest">
          <div className="row-between">
            <Link to={`/site/${latestSite.slug}`} className="log-site">{latestSite.name}</Link>
            <span className="small muted">{dateLabel(latest.date)}</span>
          </div>
          <DepthProfile maxDepthFt={latest.maxDepthFt} bottomMin={latest.bottomMin} />
          <div className="tiles-3 plain">
            <div><span className="stat-value">{latest.maxDepthFt} ft</span><span className="tiny muted">Max depth</span></div>
            <div><span className="stat-value">{latest.bottomMin} min</span><span className="tiny muted">Bottom time</span></div>
            <div><span className="stat-value">{latest.tempAtDepthF ? `${latest.tempAtDepthF}°F` : '--'}</span><span className="tiny muted">At depth</span></div>
          </div>
          {latest.notes && <p className="small">{latest.notes}</p>}
          <p className="tiny muted">{latest.shareConditions ? 'Temperature shared with site conditions' : 'Kept private'}{latest.exposureSuit ? `, ${latest.exposureSuit} suit` : ''}</p>
        </article>
      )}

      {rest.length > 0 && (
        <section>
          {rest.map((d) => {
            const s = SITES.find((x) => x.id === d.siteId);
            return (
              <div key={d.id} className="log-row">
                <span className="small-strong">{s?.name}</span>
                <span className="small muted">{dateLabel(d.date)}, {d.maxDepthFt} ft, {d.bottomMin} min</span>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
