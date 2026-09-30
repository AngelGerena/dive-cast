import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { submitCert } from '../lib/api';
import { useAuth } from '../lib/auth';
import { invalidate } from '../lib/query';

const AGENCIES = ['PADI', 'SSI', 'NAUI', 'SDI / TDI', 'RAID', 'CMAS', 'BSAC', 'GUE', 'Other'];
const LEVELS = ['Open Water Diver', 'Advanced Open Water Diver', 'Rescue Diver', 'Enriched Air Nitrox', 'Divemaster', 'Instructor', 'Cavern Diver', 'Cave Diver', 'Wreck Diver', 'Deep Diver'];
const MAX_MB = 8;

export default function AddCertification() {
  const nav = useNavigate();
  const { userId } = useAuth();
  const [agency, setAgency] = useState(AGENCIES[0]);
  const [level, setLevel] = useState('');
  const [last4, setLast4] = useState('');
  const [date, setDate] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = (set: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setError(`That photo is over ${MAX_MB} MB. Take a new photo or pick a smaller one.`);
      e.target.value = '';
      return;
    }
    setError('');
    set(f);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!level.trim()) return setError('Enter your certification level.');
    if (!front) return setError('Add a photo of the front of your card.');
    setBusy(true);
    setError('');
    try {
      await submitCert(userId, { agency, level: level.trim(), numberLast4: last4.trim() || undefined, certifiedOn: date || undefined, front, back: back ?? undefined });
      invalidate('certs');
      nav('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <PageHeader title="Add certification" sub="We review the card photo, usually within a day" />
      <form className="form" onSubmit={submit} noValidate>
        <label>Agency
          <select value={agency} onChange={(e) => setAgency(e.target.value)}>{AGENCIES.map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        <label>Certification level
          <input list="cert-levels" placeholder="Advanced Open Water Diver" value={level} onChange={(e) => setLevel(e.target.value)} required />
          <datalist id="cert-levels">{LEVELS.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        <div className="form-2">
          <label>Last 4 of card number<input type="text" maxLength={4} placeholder="4471" value={last4} onChange={(e) => setLast4(e.target.value.replace(/[^0-9A-Za-z]/g, ''))} /></label>
          <label>Certified on<input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <label>Photo of the front of your card
          <input type="file" accept="image/*" onChange={pick(setFront)} required />
        </label>
        <label>Photo of the back (optional)
          <input type="file" accept="image/*" onChange={pick(setBack)} />
        </label>
        <p className="tiny muted">Only you and the DiveCast review team can see these photos. We only store the last four digits of your number.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-accent" disabled={busy}>{busy ? 'Uploading...' : 'Submit for review'}</button>
      </form>
    </main>
  );
}
