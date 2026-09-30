import type { Tides } from '../lib/conditions';

const W = 320;
const H = 72;

export function TideChart({ tides }: { tides: Tides }) {
  const pts = tides.hourly;
  if (pts.length < 2) return <p className="muted small">No tide predictions for today.</p>;
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const lo = Math.min(...pts.map((p) => p.ft)) - 0.2;
  const hi = Math.max(...pts.map((p) => p.ft)) + 0.2;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const y = (ft: number) => H - 6 - ((ft - lo) / (hi - lo)) * (H - 14);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.ft).toFixed(1)}`).join(' ');
  const now = Date.now();
  const nowX = now >= t0 && now <= t1 ? x(now) : null;
  const marks = tides.hilo.filter((h) => h.t >= t0 && h.t <= t1);
  const next = tides.hilo.find((h) => h.t > now);
  return (
    <div className="tide">
      <div className="row-between">
        <span className="label-strong">Tide</span>
        {next && (
          <span className="accent small-strong">
            {next.type === 'H' ? 'High' : 'Low'} at {new Date(next.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}, {next.ft.toFixed(1)} ft
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Tide height over the next 24 hours">
        <path d={`${line} L${W} ${H} L0 ${H} Z`} className="tide-fill" />
        <path d={line} className="tide-line" />
        {nowX !== null && <line x1={nowX} x2={nowX} y1={0} y2={H} className="tide-now" />}
        {marks.map((m) => (
          <circle key={m.t} cx={x(m.t)} cy={y(m.ft)} r={4} className="tide-dot" />
        ))}
      </svg>
      <div className="row-between tiny muted">
        <span>{new Date(t0).toLocaleTimeString('en-US', { hour: 'numeric' })}</span>
        <span>{new Date((t0 + t1) / 2).toLocaleTimeString('en-US', { hour: 'numeric' })}</span>
        <span>{new Date(t1).toLocaleTimeString('en-US', { hour: 'numeric' })}</span>
      </div>
    </div>
  );
}
