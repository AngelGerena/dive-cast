import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Icon } from './Icon';

const ITEMS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/explore', label: 'Explore', icon: 'explore' },
  { to: '/dives', label: 'Buddies', icon: 'users' },
  { to: '/profile', label: 'Profile', icon: 'user' }
];

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);
  const item = (i: (typeof ITEMS)[number]) => (
    <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
      <Icon name={i.icon} />
      <span>{i.label}</span>
    </NavLink>
  );
  return (
    <>
      <nav className="bottom-nav" aria-label="Main">
        {left.map(item)}
        <button type="button" className="nav-dive" aria-label="Dive actions" aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="plus" size={26} stroke={2.2} />
        </button>
        {right.map(item)}
      </nav>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet glass" role="dialog" aria-label="Dive actions" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2 className="display-sm">Dive</h2>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <Link className="sheet-action" to="/log/new" onClick={() => setOpen(false)}>
              <Icon name="log" /> <span><strong>Log a dive</strong><small>Your temperature and visibility help other divers</small></span>
            </Link>
            <Link className="sheet-action" to="/dives/new" onClick={() => setOpen(false)}>
              <Icon name="users" /> <span><strong>Post an open dive</strong><small>Find a buddy for your next dive</small></span>
            </Link>
            <Link className="sheet-action" to="/log" onClick={() => setOpen(false)}>
              <Icon name="calendar" /> <span><strong>Logbook</strong><small>Your dives and yearly stats</small></span>
            </Link>
            <Link className="sheet-action is-alert" to="/emergency" onClick={() => setOpen(false)}>
              <Icon name="shield" /> <span><strong>Emergency card</strong><small>Saved on this phone, works without signal</small></span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
