import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { cardUrl, fetchPendingCerts, reviewCert } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { invalidate, useQuery } from '../../lib/query';
import type { Certification } from '../../lib/types';

export default function ReviewCertifications() {
  const { isAdmin } = useAuth();
  const q = useQuery(isAdmin ? 'admin:certs' : null, fetchPendingCerts);
  if (!isAdmin) {
    return (
      <main className="page">
        <PageHeader title="Review certifications" />
        <p className="muted">This screen is for the DiveCast review team.</p>
      </main>
    );
  }
  const list = q.data ?? [];
  return (
    <main className="page">
      <PageHeader title="Review certifications" sub={`${list.length} waiting`} />
      {q.loading && <p className="muted">Loading...</p>}
      {q.error && <p className="form-error" role="alert">{q.error}</p>}
      {!q.loading && list.length === 0 && (
        <div className="empty card"><p><strong>All caught up.</strong></p><p className="small muted">New certification photos land here for review.</p></div>
      )}
      {list.map((c) => <ReviewCard key={c.id} cert={c} />)}
    </main>
  );
}

function ReviewCard({ cert }: { cert: Certification }) {
  const { userId } = useAuth();
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const paths = [cert.cardFrontPath, cert.cardBackPath].filter(Boolean) as string[];
    Promise.all(paths.map(cardUrl)).then(setUrls).catch(() => setError('Could not load the card photos.'));
  }, [cert.cardFrontPath, cert.cardBackPath]);

  const decide = async (status: 'verified' | 'unverified') => {
    if (!userId) return;
    setBusy(true);
    setError('');
    try {
      await reviewCert(cert.id, userId, status);
      invalidate('admin:certs');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the decision.');
      setBusy(false);
    }
  };

  return (
    <article className="card stack-10">
      <div className="row-between"><strong>{cert.diverName ?? 'Diver'}</strong><span className="tag">In review</span></div>
      <p className="small">{cert.agency} {cert.level}{cert.numberLast4 ? `, number ending ${cert.numberLast4}` : ''}{cert.certifiedOn ? `, certified ${cert.certifiedOn}` : ''}</p>
      <div className="grid-2">
        {urls.map((u, i) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="card-photo"><img src={u} alt={i === 0 ? 'Front of card' : 'Back of card'} /></a>
        ))}
      </div>
      <p className="tiny muted">Check the name matches the profile and the agency and level match the card. Confirm with the agency lookup when in doubt.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions-2">
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => decide('unverified')}>Not verified</button>
        <button type="button" className="btn btn-accent" disabled={busy} onClick={() => decide('verified')}>Verify</button>
      </div>
    </article>
  );
}
