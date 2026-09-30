import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function PageHeader({ title, action, sub }: { title?: string; sub?: string; action?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="page-header">
      <button type="button" className="icon-btn" aria-label="Back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}>
        <Icon name="back" />
      </button>
      {title && (
        <div className="page-header-title">
          <h1 className="display-sm">{title}</h1>
          {sub && <p className="muted small">{sub}</p>}
        </div>
      )}
      <div className="page-header-action">{action}</div>
    </header>
  );
}
