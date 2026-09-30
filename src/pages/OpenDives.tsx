import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { cancelOpenDive, requestToJoin, setRequestStatus } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useOpenDives, useRequests, useSites } from '../lib/hooks';
import { invalidate } from '../lib/query';
import { dayLabel, dayNum, timeLabel } from '../lib/format';
import type { JoinRequest, OpenDive } from '../lib/types';

const FILTERS = ['All', 'Shore', 'Boat', 'This weekend', 'Mine'] as const;

function isThisWeekend(iso: string) {
  const d = new Date(iso);
  const days = (d.getTime() - Date.now()) / 86400000;
  return days < 7 && (d.getDay() === 0 || d.getDay() === 6);
}

export default function OpenDives() {
  const { userId } = useAuth();
  const dives = useOpenDives();
  const requests = useRequests();
  const [f, setF] = useState<(typeof FILTERS)[number]>('All');
  const list = (dives.data ?? []).filter((d) =>
    f === 'All' ? true : f === 'Shore' ? d.access === 'shore' : f === 'Boat' ? d.access === 'boat' : f === 'Mine'
      ? d.hostId === userId || (requests.data ?? []).some((r) => r.openDiveId === d.id && r.diverId === userId && r.status !== 'withdrawn')
      : isThisWeekend(d.startsAt)
  );
  return (
    <main className="page">
      <header className="stack-10">
        <h1 className="display-lg reef-title">Open dives</h1>
        <div className="row-between">
          <p className="muted">Find a buddy, or post your own</p>
          <Link to="/dives/new" className="btn btn-social btn-sm">Post a dive</Link>
        </div>
      </header>
      <div className="chip-row" role="group" aria-label="Filter open dives">
        {FILTERS.map((x) => (
          <button key={x} type="button" className={`chip chip-toggle${f === x ? ' is-on' : ''}`} aria-pressed={f === x} onClick={() => setF(x)}>{x}</button>
        ))}
      </div>
      {dives.loading && <p className="muted">Loading open dives...</p>}
      {dives.error && <p className="form-error" role="alert">Could not load open dives. {dives.error}</p>}
      {!dives.loading && !dives.error && list.length === 0 && (
        <div className="empty card">
          <p><strong>{f === 'All' ? 'No open dives yet.' : 'No open dives match that filter.'}</strong></p>
          <p className="small muted">Post one and divers nearby can ask to join you.</p>
          <Link to="/dives/new" className="btn btn-social">Post a dive</Link>
        </div>
      )}
      {list.map((d) => (
        <OpenDiveCard key={d.id} dive={d} requests={(requests.data ?? []).filter((r) => r.openDiveId === d.id)} />
      ))}
      <p className="tiny muted disclaimer">Only divers with a verified certification can post or join. Meet at the dive shop or site entry, and agree on your plan before you get in the water.</p>
    </main>
  );
}

function OpenDiveCard({ dive, requests }: { dive: OpenDive; requests: JoinRequest[] }) {
  const { userId } = useAuth();
  const { byId } = useSites();
  const site = byId(dive.siteId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mine = dive.hostId === userId;
  const myReq = requests.find((r) => r.diverId === userId);
  const pending = requests.filter((r) => r.status === 'pending');
  const accepted = requests.filter((r) => r.status === 'accepted');
  const left = Math.max(dive.spotsOpen - (dive.acceptedCount ?? 0), 0);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      invalidate('requests', 'opendives');
    } catch (e) {
      setError(e instanceof Error ? friendly(e.message) : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="od-card">
      <div className="row gap-14">
        <div className={`date-block${mine || myReq?.status === 'accepted' ? ' is-on' : ''}`}>
          <span className="date-day">{dayLabel(dive.startsAt)}</span>
          <span className="date-num">{dayNum(dive.startsAt)}</span>
        </div>
        <div className="stack-4 grow">
          <Link to={`/site/${site?.slug ?? ''}`} className="od-title">{site?.name ?? 'Dive site'}</Link>
          <span className="small muted">{timeLabel(dive.startsAt)} {dive.access} dive, max {dive.maxDepthFt} ft</span>
          <span className="small host">
            {mine ? 'Your dive' : `Hosted by ${dive.hostName}`}
            {dive.hostVerified && <span className="verified"><Icon name="check" size={14} stroke={2.6} /> Cert verified</span>}
          </span>
        </div>
      </div>
      {dive.note && <p className="small">{dive.note}</p>}
      <div className="chip-row">
        <span className="tag">{dive.minCert}+</span>
        <span className="tag">{dive.pace}</span>
      </div>

      {mine && (
        <div className="stack-10">
          {pending.length === 0 && accepted.length === 0 && <p className="small muted">No requests yet. You will see them here.</p>}
          {accepted.map((r) => (
            <div key={r.id} className="row-between small"><span><strong>{r.diverName ?? 'Diver'}</strong> is diving with you</span><span className="tag tag-ok">Accepted</span></div>
          ))}
          {pending.map((r) => (
            <div key={r.id} className="request-row">
              <span className="small"><strong>{r.diverName ?? 'Diver'}</strong> asked to join</span>
              <div className="row gap-8">
                <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act(() => setRequestStatus(r.id, 'declined'))}>Decline</button>
                <button type="button" className="btn btn-sm btn-accent" disabled={busy || left === 0} onClick={() => act(() => setRequestStatus(r.id, 'accepted'))}>Accept</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row-between">
        <span className={`small-strong${left === 1 ? ' social' : ''}`}>{left === 0 ? 'Full' : `${left} ${left === 1 ? 'spot' : 'spots'} left`}</span>
        {mine ? (
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => { if (window.confirm('Cancel this open dive? Divers who joined will see it removed.')) act(() => cancelOpenDive(dive.id)); }}>Cancel dive</button>
        ) : myReq && myReq.status === 'pending' ? (
          <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => act(() => setRequestStatus(myReq.id, 'withdrawn'))}>Requested, tap to withdraw</button>
        ) : myReq && myReq.status === 'accepted' ? (
          <span className="tag tag-ok">You're in</span>
        ) : myReq && myReq.status === 'declined' ? (
          <span className="tag">Not this time</span>
        ) : (
          <button type="button" className="btn btn-sm btn-social" disabled={busy || left === 0} onClick={() => act(() => requestToJoin(userId!, dive.id, myReq))}>Request to join</button>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </article>
  );
}

function friendly(msg: string) {
  if (/row-level security|violates/i.test(msg)) return 'Only divers with a verified certification can join. Add your certification in Profile.';
  return msg;
}
