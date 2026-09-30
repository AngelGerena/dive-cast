import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { saveProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSites } from '../lib/hooks';

// First-run setup and the Edit profile screen share this form.
export default function Onboarding({ editing = false }: { editing?: boolean }) {
  const { userId, profile, refreshProfile } = useAuth();
  const { sites, home, offline } = useSites();
  const nav = useNavigate();
  const [name, setName] = useState(profile?.onboarded ? profile.displayName : '');
  const [area, setArea] = useState(profile?.homeArea ?? '');
  const [since, setSince] = useState(profile?.divingSince ?? '');
  const [homeSite, setHomeSite] = useState(profile?.homeSiteId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const selectedHome = homeSite || home()?.id || '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (name.trim().length < 2) return setError('Enter the name other divers will see.');
    setBusy(true);
    setError('');
    try {
      await saveProfile(userId, { displayName: name, homeArea: area, divingSince: since, homeSiteId: offline ? undefined : selectedHome || undefined });
      await refreshProfile();
      setSaved(true);
      if (editing) nav('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      {editing ? <PageHeader title="Edit profile" /> : (
        <section className="stack-10">
          <h1 className="display-lg">Welcome aboard</h1>
          <p className="lede">Tell us a little about yourself. Other divers see your name when you post or join a dive.</p>
        </section>
      )}
      <form className="form" onSubmit={submit} noValidate>
        <label>Your name
          <input type="text" autoComplete="name" placeholder="First and last name" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>Where you dive from (optional)
          <input type="text" placeholder="Deltona, FL" value={area} onChange={(e) => setArea(e.target.value)} />
        </label>
        <label>Diving since (optional)
          <input type="text" inputMode="numeric" maxLength={4} placeholder="2019" value={since} onChange={(e) => setSince(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label>Home dive site
          <select value={selectedHome} onChange={(e) => setHomeSite(e.target.value)}>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}, {s.area}</option>)}
          </select>
        </label>
        <p className="tiny muted">Your home site's conditions show first on the Home screen.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {saved && !editing && <p className="accent small-strong" role="status">Saved</p>}
        <button type="submit" className="btn btn-accent" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Continue'}</button>
      </form>
    </main>
  );
}
