import { useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { EMERGENCY_NUMBERS } from '../lib/config';
import { setState, useLocal } from '../lib/store';
import type { EmergencyCard } from '../lib/types';

const FIELDS: { key: keyof EmergencyCard; label: string; type?: string; autoComplete?: string }[] = [
  { key: 'fullName', label: 'Your full name', autoComplete: 'name' },
  { key: 'emergencyContactName', label: 'Emergency contact name' },
  { key: 'emergencyContactPhone', label: 'Emergency contact phone', type: 'tel' },
  { key: 'danMember', label: 'DAN member number (optional)' },
  { key: 'insuranceProvider', label: 'Dive insurance provider (optional)' },
  { key: 'policyNumber', label: 'Policy number (optional)' }
];

export default function Emergency() {
  const card = useLocal((s) => s.emergency);
  const [editing, setEditing] = useState(!card.fullName);
  const [draft, setDraft] = useState<EmergencyCard>(card);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(card);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const next = { ...draft, updatedAt: new Date().toISOString() };
    setState((s) => ({ ...s, emergency: next }));
    setSaved(true);
    setEditing(false);
  };

  return (
    <main className="page">
      <PageHeader title="Emergency card" sub="Saved on this phone. Works without signal." />
      <section className="emergency-numbers">
        {EMERGENCY_NUMBERS.map((n) => (
          <div key={n.label} className="row-between">
            <span className="small">{n.label}</span>
            {n.value.startsWith('+') || /^\d+$/.test(n.value) ? (
              <a className="mono small-strong" href={`tel:${n.value.replace(/[^\d+]/g, '')}`}>{n.value}</a>
            ) : (
              <span className="mono small-strong">{n.value}</span>
            )}
          </div>
        ))}
      </section>

      {!editing ? (
        <section className="card stack-10">
          {saved && <p className="accent small-strong" role="status">Saved on this device</p>}
          <dl className="ec-list">
            {FIELDS.map((f) => (card[f.key] ? (
              <div key={f.key}><dt>{f.label.replace(' (optional)', '')}</dt><dd>{f.key === 'emergencyContactPhone' ? <a href={`tel:${card[f.key]}`}>{card[f.key]}</a> : card[f.key]}</dd></div>
            ) : null))}
            {card.medicalNotes && <div><dt>Notes for responders</dt><dd>{card.medicalNotes}</dd></div>}
          </dl>
          <button type="button" className="btn btn-outline" onClick={() => { setDraft(card); setEditing(true); setSaved(false); }}>Edit card</button>
        </section>
      ) : (
        <form className="form" onSubmit={save}>
          {FIELDS.map((f) => (
            <label key={f.key}>{f.label}
              <input type={f.type ?? 'text'} autoComplete={f.autoComplete} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} required={f.key === 'fullName'} />
            </label>
          ))}
          <label>Notes for responders (optional)
            <textarea rows={3} placeholder="Only what you want a responder to see" value={draft.medicalNotes} onChange={(e) => setDraft({ ...draft, medicalNotes: e.target.value })} />
          </label>
          <p className="tiny muted">This stays on your phone. It is not uploaded or shared.</p>
          <button type="submit" className="btn btn-accent" disabled={!dirty || !draft.fullName.trim()}>Save card</button>
        </form>
      )}
      <p className="tiny muted disclaimer">In an emergency, call 911 first. Numbers listed here should be confirmed for your area before you travel.</p>
    </main>
  );
}
