// A simplified dive profile drawn from max depth and bottom time: descent, bottom, safety stop, ascent.
export function DepthProfile({ maxDepthFt, bottomMin }: { maxDepthFt: number; bottomMin: number }) {
  const W = 340;
  const H = 88;
  const y = (d: number) => 6 + (d / Math.max(maxDepthFt, 20)) * (H - 12);
  const x = (m: number) => (m / bottomMin) * W;
  const stop = Math.min(15, maxDepthFt * 0.6);
  const pts: [number, number][] = [
    [0, 0], [bottomMin * 0.06, maxDepthFt * 0.9], [bottomMin * 0.25, maxDepthFt], [bottomMin * 0.5, maxDepthFt * 0.85],
    [bottomMin * 0.72, maxDepthFt * 0.95], [bottomMin * 0.84, stop], [bottomMin * 0.95, stop], [bottomMin, 0]
  ];
  const d = pts.map(([m, dep], i) => `${i ? 'L' : 'M'}${x(m).toFixed(1)} ${y(dep).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Dive profile to ${maxDepthFt} feet over ${bottomMin} minutes with a safety stop`}>
      <path d={`${d} L${W} ${H} L0 ${H} Z`} className="profile-fill" />
      <path d={d} className="profile-line" />
    </svg>
  );
}
