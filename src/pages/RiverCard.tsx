import type { Result, River } from '../lib/conditions';
import { relTime } from '../lib/format';

export function RiverCard({ result }: { result: Result<River> }) {
  if (result.status === 'loading') return <section className="card"><p className="muted small">Checking the river gauge...</p></section>;
  if (result.status === 'unavailable') {
    return (
      <section className="card">
        <p className="label-strong">River level</p>
        <p className="muted small">The USGS gauge is not responding right now. Check with the park before you go.</p>
      </section>
    );
  }
  const r = result.data;
  const pct = Math.round(r.position * 100);
  const word = r.position > 0.75 ? 'Higher than usual' : r.position < 0.25 ? 'Lower than usual' : 'Near its usual level';
  return (
    <section className="card stack-10">
      <div className="row-between">
        <span className="label-strong">River level</span>
        <span className="accent small-strong">{word}</span>
      </div>
      <div className="gauge" role="img" aria-label={`${r.latestFt.toFixed(2)} feet, ${pct} percent of the way between the 30 day low and high`}>
        <div className="gauge-track" />
        <div className="gauge-marker" style={{ left: `calc(${pct}% - 11px)` }} />
      </div>
      <div className="row-between tiny muted">
        <span>30-day low {r.minFt.toFixed(1)} ft</span>
        <span>Now {r.latestFt.toFixed(2)} ft</span>
        <span>High {r.maxFt.toFixed(1)} ft</span>
      </div>
      <p className="small">Springs have no tide. High river water lowers visibility and can close cave access.</p>
      <p className="tiny muted">{r.label}, USGS, {relTime(new Date(r.observedAt).toISOString())}{result.stale ? ' (last saved reading)' : ''}</p>
    </section>
  );
}
