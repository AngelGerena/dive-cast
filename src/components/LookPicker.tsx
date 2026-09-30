import { Icon } from './Icon';
import { setTheme, THEMES, useLocal } from '../lib/store';

// The diver's look switch: Abyss, Sonar or Reef Pro. Saved on the device and applied instantly.
export function LookPicker() {
  const theme = useLocal((s) => s.theme);
  return (
    <div className="look-grid" role="radiogroup" aria-label="App look">
      {THEMES.map((t) => (
        <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} className={`look-option${theme === t.id ? ' is-on' : ''}`} onClick={() => setTheme(t.id)}>
          <span className={`look-swatch look-${t.id}`} aria-hidden="true">
            <span className="s1">{t.id === 'reef' ? '' : '81°'}</span>
            <span className="s2" />
          </span>
          <strong>{theme === t.id && <Icon name="check" size={14} stroke={3} />}{t.name}</strong>
          <span className="look-note">{t.note}</span>
        </button>
      ))}
    </div>
  );
}
