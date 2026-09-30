import { Link } from 'react-router-dom';
import type { ConditionReport } from '../lib/types';

const W = 300;
const H = 260;

interface Pt { depth: number; temp: number; n: number }

// Buckets diver reports by 10 ft, averages them, and flags the steepest drop as a thermocline.
export function buildProfile(reports: ConditionReport[], surfaceF?: number): Pt[] {
  const buckets = new Map<number, number[]>();
  reports.forEach((r) => {
    if (r.depthFt == null || r.tempF == null) return;
    const b = Math.round(r.depthFt / 10) * 10;
    buckets.set(b, [...(buckets.get(b) ?? []), r.tempF]);
  });
  const pts: Pt[] = [...buckets.entries()].map(([depth, temps]) => ({ depth, temp: temps.reduce((a, b) => a + b, 0) / temps.length, n: temps.length }));
  if (surfaceF != null && !buckets.has(0)) pts.push({ depth: 0, temp: surfaceF, n: 1 });
  return pts.sort((a, b) => a.depth - b.depth);
}

export function ThermalProfile({ reports, surfaceF, siteSlug, maxDepth }: { reports: ConditionReport[]; surfaceF?: number; siteSlug: string; maxDepth: number }) {
  const pts = buildProfile(reports, surfaceF);
  if (pts.length < 2) {
    return (
      <div className="instrument">
        <p className="mono small">Not enough depth readings yet. Log a dive here with your temperature at depth and it will build this chart for everyone.</p>
        <Link className="btn btn-heat" to={`/log/new?site=${siteSlug}`}>Log a dive here</Link>
      </div>
    );
  }
  const deepest = Math.max(maxDepth, ...pts.map((p) => p.depth));
  const tMin = Math.floor(Math.min(...pts.map((p) => p.temp)) - 1);
  const tMax = Math.ceil(Math.max(...pts.map((p) => p.temp)) + 1);
  const x = (t: number) => 40 + ((t - tMin) / (tMax - tMin)) * (W - 56);
  const y = (d: number) => 10 + (d / deepest) * (H - 20);
  let band: [number, number] | null = null;
  let steepest = 0.08; // degrees F per foot
  for (let i = 1; i < pts.length; i++) {
    const rate = (pts[i - 1].temp - pts[i].temp) / (pts[i].depth - pts[i - 1].depth);
    if (rate > steepest) {
      steepest = rate;
      band = [pts[i - 1].depth, pts[i].depth];
    }
  }
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((deepest * f) / 10) * 10);
  const deepPt = pts[pts.length - 1];
  return (
    <div className="instrument">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Temperature falls from ${pts[0].temp.toFixed(0)} degrees near the surface to ${deepPt.temp.toFixed(0)} degrees at ${deepPt.depth} feet`}>
        {band && <rect x={0} y={y(band[0])} width={W} height={y(band[1]) - y(band[0])} className="thermo-band" />}
        {ticks.map((d) => (
          <g key={d}>
            <line x1={0} x2={W} y1={y(d)} y2={y(d)} className="grid-line" />
            <text x={2} y={y(d) - 4} className="axis-text">{d} ft</text>
          </g>
        ))}
        {band && <text x={W - 4} y={y((band[0] + band[1]) / 2) + 4} textAnchor="end" className="band-text">Thermocline</text>}
        <polyline points={pts.map((p) => `${x(p.temp)},${y(p.depth)}`).join(' ')} className="thermo-line" />
        {pts.map((p) => (
          <circle key={p.depth} cx={x(p.temp)} cy={y(p.depth)} r={4} className="thermo-dot" />
        ))}
      </svg>
      <div className="row-between tiny mono muted">
        <span>{tMin}°F</span>
        <span>{tMax}°F</span>
      </div>
    </div>
  );
}
