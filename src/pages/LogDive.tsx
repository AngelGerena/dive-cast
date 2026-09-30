import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { addDive } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSites } from '../lib/hooks';
import { invalidate } from '../lib/query';
import type { CurrentStrength } from '../lib/types';

const CURRENTS: CurrentStrength[] = ['none', 'light', 'moderate', 'strong'];

export default function LogDive() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { userId } = useAuth();
  const { sites: SITES, bySlug, offline } = useSites();
  const [siteId, setSiteId] = useState(bySlug(params.get('site') ?? '')?.id ?? '');
  const chosenId = siteId || SITES[0]?.id || '';
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [maxDepth, setMaxDepth] = useState('');
  const [bottom, setBottom] = useState('');
  const [temp, setTemp] = useState('');
  const [vis, setVis] = useState('');
  const [current, setCurrent] = useState<CurrentStrength | ''>('');
  const [suit, setSuit] = useState('');
  const [notes, setNotes] = useState('');
  const [share, setShare] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (offline) return setError('The dive site list is offline right now. Try again when you have signal.');
    const depth = Number(maxDepth);
    const mins = Number(bottom);
    if (!depth || depth < 1) return setError('Enter your max depth in feet.');
    if (!mins || mins < 1) return setError('Enter your bottom time in minutes.');
    setBusy(true);
    setError('');
    try {
      await addDive(userId, {
        siteId: chosenId, date, maxDepthFt: depth, bottomMin: mins,
        tempAtDepthF: temp ? Number(temp) : undefined, visibilityFt: vis ? Number(vis) : undefined,
        current: current || undefined, exposureSuit: suit.trim() || undefined, notes: notes.trim() || undefined, shareConditions: share
      });
      invalidate('dives', 'reports');
      nav('/log');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the dive. Try again.');
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <PageHeader title="Log a dive" sub="Numbers from your dive computer" />
      <form className="form" onSubmit={submit} noValidate>
        <label>Dive site
          <select value={chosenId} onChange={(e) => setSiteId(e.target.value)}>
            {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}, {s.area}</option>)}
          </select>
        </label>
        <label>Date<input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></label>
        <div className="form-2">
          <label>Max depth (ft)<input type="number" inputMode="numeric" min={1} max={400} value={maxDepth} onChange={(e) => setMaxDepth(e.target.value)} required /></label>
          <label>Bottom time (min)<input type="number" inputMode="numeric" min={1} max={600} value={bottom} onChange={(e) => setBottom(e.target.value)} required /></label>
        </div>
        <div className="form-2">
          <label>Temp at depth (°F)<input type="number" inputMode="decimal" min={30} max={100} value={temp} onChange={(e) => setTemp(e.target.value)} /></label>
          <label>Visibility (ft)<input type="number" inputMode="numeric" min={0} max={300} value={vis} onChange={(e) => setVis(e.target.value)} /></label>
        </div>
        <div className="form-2">
          <label>Current
            <select value={current} onChange={(e) => setCurrent(e.target.value as CurrentStrength | '')}>
              <option value="">Not noted</option>
              {CURRENTS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </label>
          <label>Exposure suit<input type="text" placeholder="3 mm" value={suit} onChange={(e) => setSuit(e.target.value)} /></label>
        </div>
        <label>Notes<textarea rows={3} placeholder="What you saw, how it felt, what to change next time" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <label className="switch-row">
          <span>
            <strong>Share temperature and visibility</strong>
            <small className="muted">Helps build the temperature by depth chart for this site. Your name shows on the report.</small>
          </span>
          <input type="checkbox" role="switch" checked={share} onChange={(e) => setShare(e.target.checked)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-accent" disabled={busy}>{busy ? 'Saving...' : 'Save dive'}</button>
      </form>
    </main>
  );
}
