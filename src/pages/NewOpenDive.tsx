import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { postOpenDive } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useMyCerts, useSites } from '../lib/hooks';
import { invalidate } from '../lib/query';

const PACES = ['Relaxed pace', 'Photo pace', 'Steady pace', 'Training dive'];
const CERTS = ['Open Water', 'Advanced Open Water', 'Rescue Diver'];

export default function NewOpenDive() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { userId } = useAuth();
  const { sites, bySlug, offline } = useSites();
  const certs = useMyCerts();
  const verified = (certs.data ?? []).some((c) => c.status === 'verified');
  const [siteId, setSiteId] = useState(bySlug(params.get('site') ?? '')?.id ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('08:00');
  const [maxDepth, setMaxDepth] = useState('');
  const [pace, setPace] = useState(PACES[0]);
  const [spots, setSpots] = useState('1');
  const [minCert, setMinCert] = useState(CERTS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = sites.find((s) => s.id === siteId) ?? sites[0];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !chosen) return;
    if (offline) return setError('The dive site list is offline right now. Try again when you have signal.');
    if (!date) return setError('Pick the date of the dive.');
    const startsAt = new Date(`${date}T${time}`);
    if (startsAt.getTime() < Date.now()) return setError('That date and time has already passed. Pick a future time.');
    setBusy(true);
    setError('');
    try {
      await postOpenDive(userId, {
        siteId: chosen.id, startsAt: startsAt.toISOString(), access: chosen.access,
        maxDepthFt: Math.min(Number(maxDepth) || chosen.maxDepthFt, 400), pace, spotsOpen: Math.min(Math.max(Number(spots) || 1, 1), 6),
        minCert, note: note.trim() || undefined
      });
      invalidate('opendives');
      nav('/dives');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post. Try again.');
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <PageHeader title="Post an open dive" sub="Divers with a verified certification can ask to join" />
      {!certs.loading && !verified && (
        <div className="notice stack-10">
          <p>You need a verified certification to post. Add a photo of your card and we will review it.</p>
          <Link to="/profile/certification" className="btn btn-accent btn-sm">Add certification</Link>
        </div>
      )}
      <form className="form" onSubmit={submit} noValidate>
        <label>Dive site
          <select value={chosen?.id ?? ''} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}, {s.area}</option>)}
          </select>
        </label>
        <div className="form-2">
          <label>Date<input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} required /></label>
          <label>Meet time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></label>
        </div>
        <div className="form-2">
          <label>Planned max depth (ft)<input type="number" inputMode="numeric" min={5} max={chosen?.maxDepthFt} placeholder={String(chosen?.maxDepthFt ?? '')} value={maxDepth} onChange={(e) => setMaxDepth(e.target.value)} /></label>
          <label>Open spots<input type="number" inputMode="numeric" min={1} max={6} value={spots} onChange={(e) => setSpots(e.target.value)} /></label>
        </div>
        <label>Pace
          <select value={pace} onChange={(e) => setPace(e.target.value)}>{PACES.map((p) => <option key={p}>{p}</option>)}</select>
        </label>
        <label>Minimum certification
          <select value={minCert} onChange={(e) => setMinCert(e.target.value)}>{CERTS.map((p) => <option key={p}>{p}</option>)}</select>
        </label>
        <label>Note for buddies (optional)
          <textarea rows={3} maxLength={280} placeholder="Where to meet, gas plan, what you want to see" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-social" disabled={busy || !verified}>{busy ? 'Posting...' : 'Post open dive'}</button>
      </form>
    </main>
  );
}
