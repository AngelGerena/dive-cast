import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { useMyCerts, useMyDives } from '../lib/hooks';
import { setTheme, useLocal } from '../lib/store';
import { APP_NAME } from '../lib/config';

export default function Profile() {
  const { profile, isAdmin, signOut, session } = useAuth();
  const dives = useMyDives().data ?? [];
  const certsQ = useMyCerts();
  const certs = certsQ.data ?? [];
  const theme = useLocal((s) => s.theme);
  const hasCard = useLocal((s) => Boolean(s.emergency.fullName));
  const deepest = dives.reduce((a, d) => Math.max(a, d.maxDepthFt), 0);
  const hours = Math.round(dives.reduce((a, d) => a + d.bottomMin, 0) / 60);
  const primary = certs.find((c) => c.status === 'verified') ?? certs[0];
  const others = certs.filter((c) => c !== primary);
  if (!profile) return null;

  return (
    <main className="page">
      <section className="profile-head">
        <span className="avatar avatar-lg">{profile.initials}</span>
        <h1 className="display-md">{profile.displayName}</h1>
        <p className="muted small">{[profile.divingSince ? `Diving since ${profile.divingSince}` : '', profile.homeArea].filter(Boolean).join(', ') || session?.user.email}</p>
        <Link to="/profile/edit" className="btn btn-ghost btn-sm">Edit profile</Link>
      </section>
      <section className="stat-strip">
        <div><span className="stat-value accent">{dives.length}</span><span className="tiny muted">Dives logged</span></div>
        <div><span className="stat-value">{deepest ? `${deepest} ft` : '--'}</span><span className="tiny muted">Deepest</span></div>
        <div><span className="stat-value">{hours} h</span><span className="tiny muted">Underwater</span></div>
      </section>

      <div className="row-between">
        <h2 className="section-title">Certifications</h2>
        <Link to="/profile/certification" className="link">Add</Link>
      </div>
      {certsQ.loading && <p className="small muted">Loading...</p>}
      {!certsQ.loading && certs.length === 0 && (
        <div className="empty card">
          <p><strong>No certification on file yet.</strong></p>
          <p className="small muted">Add a photo of your card. Once it is verified you can post and join open dives.</p>
          <Link to="/profile/certification" className="btn btn-accent btn-sm">Add certification</Link>
        </div>
      )}
      {primary && (
        <article className="cert-card">
          <div className="row-between">
            <span className="small">{primary.agency}</span>
            {primary.status === 'verified' ? <span className="tag tag-verified"><Icon name="check" size={12} stroke={3} /> Verified</span> : <span className="tag">{primary.status === 'in_review' ? 'In review' : 'Not verified'}</span>}
          </div>
          <div className="stack-4">
            <span className="cert-level">{primary.level}</span>
            <span className="small cert-meta">{primary.numberLast4 ? `No. ending ${primary.numberLast4}` : 'Number hidden'}{primary.certifiedOn ? `, certified ${new Date(primary.certifiedOn + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}</span>
          </div>
        </article>
      )}
      <div>
        {others.map((c) => (
          <div key={c.id} className="list-row">
            <span className="small-strong">{c.agency} {c.level}</span>
            <span className={`small ${c.status === 'verified' ? 'accent' : 'muted'}`}>{c.status === 'verified' ? 'Verified' : c.status === 'in_review' ? 'In review' : 'Not verified'}</span>
          </div>
        ))}
      </div>

      <Link to="/emergency" className="btn btn-alert"><Icon name="shield" size={20} /> {hasCard ? 'Emergency card, saved offline' : 'Set up your emergency card'}</Link>

      {isAdmin && <Link to="/admin/certifications" className="btn btn-outline">Review certifications</Link>}

      <h2 className="section-title">Appearance</h2>
      <div className="segmented" role="radiogroup" aria-label="Theme">
        <button type="button" role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'is-on' : ''} onClick={() => setTheme('dark')}><Icon name="moon" size={18} /> Abyss</button>
        <button type="button" role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'is-on' : ''} onClick={() => setTheme('light')}><Icon name="sun" size={18} /> Pelagic</button>
      </div>

      <button type="button" className="btn btn-ghost" onClick={() => signOut()}>Sign out</button>
      <p className="tiny muted center">{APP_NAME}, version 0.2</p>
    </main>
  );
}
