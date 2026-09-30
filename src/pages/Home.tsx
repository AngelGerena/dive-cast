import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { LookPicker } from '../components/LookPicker';
import { InstallPrompt } from '../components/InstallPrompt';
import { TideChart } from '../components/TideChart';
import { RiverCard } from './RiverCard';
import { useSiteConditions } from '../lib/conditions';
import { useAuth } from '../lib/auth';
import { useOpenDives, useReports, useRequests, useSites } from '../lib/hooks';
import { useLocal } from '../lib/store';
import { dayLabel, greeting, relTime, timeLabel } from '../lib/format';
import type { Site } from '../lib/types';

export default function Home() {
  const { profile, session } = useAuth();
  const { home, sites, loading } = useSites();
  const dives = useOpenDives();
  const requests = useRequests();

  const joined = (dives.data ?? []).find((d) =>
    new Date(d.startsAt).getTime() > Date.now() &&
    (d.hostId === profile?.id || (requests.data ?? []).some((r) => r.openDiveId === d.id && r.diverId === profile?.id && r.status === 'accepted'))
  );
  const site = (joined && sites.find((s) => s.id === joined.siteId)) || home(profile?.homeSiteId);
  const firstName = profile?.onboarded ? profile.displayName.split(' ')[0] : '';
  const [lookOpen, setLookOpen] = useState(false);

  return (
    <main className="page">
      <div className="home-band" aria-hidden="true" />
      <header className="row-between home-head">
        <div className="grow">
          <p className="muted small">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="display-md home-greet">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
        </div>
        <div className="row gap-8">
          <button type="button" className="icon-btn" aria-label="Change app look" onClick={() => setLookOpen(true)}>
            <Icon name="palette" size={20} />
          </button>
          {session && profile ? (
            <Link to="/profile" className="avatar" aria-label="Open profile">{profile.initials}</Link>
          ) : (
            <Link to="/profile" className="btn btn-outline btn-sm">Sign in</Link>
          )}
        </div>
      </header>

      {lookOpen && (
        <div className="sheet-backdrop" onClick={() => setLookOpen(false)}>
          <div className="sheet" role="dialog" aria-label="App look" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2 className="display-sm">App look</h2>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setLookOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <LookPicker />
            <p className="tiny muted">You can also change this anytime in Profile.</p>
          </div>
        </div>
      )}

      <InstallPrompt />

      {loading || !site ? <p className="muted">Loading dive sites...</p> : <SiteHero site={site} nextDive={joined ? `${new Date(joined.startsAt).toLocaleDateString('en-US', { weekday: 'long' })} at ${timeLabel(joined.startsAt)}` : undefined} />}

      <section className="stack-10">
        <div className="row-between">
          <h2 className="section-title">Open dives</h2>
          <Link to="/dives" className="link">See all</Link>
        </div>
        {!session && <p className="small muted">Sign in to see who is diving this week and ask to join.</p>}
        {session && dives.loading && <p className="small muted">Loading open dives...</p>}
        {session && dives.data && dives.data.length === 0 && <p className="small muted">No open dives posted yet. Tap the plus button to post the first one.</p>}
        {(dives.data ?? []).slice(0, 3).map((d) => {
          const s = sites.find((x) => x.id === d.siteId);
          return (
            <Link key={d.id} to="/dives" className="od-row">
              <span className="avatar avatar-sm">{d.hostInitials}</span>
              <span className="grow stack-2">
                <strong className="small-strong">{s?.name ?? 'Dive site'}, {dayLabel(d.startsAt)} {timeLabel(d.startsAt)}</strong>
                <span className="tiny muted">{d.hostName}, {Math.max(d.spotsOpen - (d.acceptedCount ?? 0), 0)} spots left</span>
              </span>
            </Link>
          );
        })}
      </section>

      <SavedSites />
    </main>
  );
}

function SiteHero({ site, nextDive }: { site: Site; nextDive?: string }) {
  const c = useSiteConditions(site);
  const reports = useReports(site.id);
  const list = reports.data ?? [];
  const atDepth = list.find((r) => r.depthFt && r.tempF);
  const vis = list.find((r) => r.visibilityFt);
  return (
    <>
      <section className="hero-card">
        <p className="muted small">{nextDive ? `Your next dive, ${nextDive}` : 'Your home site'}</p>
        <Link to={`/site/${site.slug}`} className="hero-title">{site.name}</Link>
        <div className="hero-reading">
          <div className="hero-number" aria-live="polite">
            {c.water.status === 'ok' ? `${Math.round(c.water.data.tempF)}°` : c.water.status === 'loading' ? '--' : 'n/a'}
          </div>
          <div className="hero-meta">
            <strong>{site.waterSource.type === 'spring' ? 'Spring water' : 'Surface water'}</strong>
            {c.water.status === 'ok' && (
              <>
                <span>{c.water.data.source}</span>
                {c.water.data.kind === 'station' && <span>{c.water.stale ? 'Last reading ' : 'Updated '}{relTime(new Date(c.water.data.observedAt).toISOString())}</span>}
              </>
            )}
            {c.water.status === 'unavailable' && <span>Source not responding. Try again soon.</span>}
          </div>
        </div>
      </section>
      <section className="tiles-3">
        <div className="tile">
          <span className="tile-label">Air</span>
          <span className="tile-value">{c.air.status === 'ok' ? `${c.air.data.tempF}°` : '--'}</span>
          <span className="tile-foot">{c.air.status === 'ok' ? c.air.data.summary : 'NWS forecast'}</span>
        </div>
        <div className="tile tile-heat">
          <span className="tile-label">{atDepth ? `At ${atDepth.depthFt} ft` : 'At depth'}</span>
          <span className="tile-value">{atDepth ? `${atDepth.tempF}°` : '--'}</span>
          <span className="tile-foot">{atDepth ? relTime(atDepth.reportedAt) : 'No reports yet'}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Visibility</span>
          <span className="tile-value">{vis ? `${vis.visibilityFt} ft` : '--'}</span>
          <span className="tile-foot">{vis ? relTime(vis.reportedAt) : 'No reports yet'}</span>
        </div>
      </section>
      {site.tideStation && c.tides.status === 'ok' && (
        <section className="card"><TideChart tides={c.tides.data} /></section>
      )}
      {site.usgsGauge && <RiverCard result={c.river} />}
    </>
  );
}

function SavedSites() {
  const saved = useLocal((s) => s.savedSiteSlugs);
  const { sites } = useSites();
  const list = sites.filter((s) => saved.includes(s.slug));
  return (
    <section className="stack-10">
      <h2 className="section-title">Saved sites</h2>
      <div className="chip-row">
        {list.map((s) => <Link key={s.id} to={`/site/${s.slug}`} className="chip">{s.name}</Link>)}
        <Link to="/explore" className="chip chip-outline">Find more</Link>
      </div>
    </section>
  );
}
