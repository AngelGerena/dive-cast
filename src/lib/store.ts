import { useRef, useSyncExternalStore } from 'react';
import type { EmergencyCard } from './types';

// Device-only preferences. Account data (profile, dives, certifications, open dives) lives in Supabase.

export type Theme = 'abyss' | 'sonar' | 'reef';

export const THEMES: { id: Theme; name: string; note: string; color: string }[] = [
  { id: 'abyss', name: 'Abyss', note: 'Deep ocean, glowing cyan', color: '#04121F' },
  { id: 'sonar', name: 'Sonar', note: 'Dive computer panel', color: '#06131A' },
  { id: 'reef', name: 'Reef Pro', note: 'Bold and sporty, light', color: '#0B1E44' }
];

export interface LocalState {
  savedSiteSlugs: string[];
  emergency: EmergencyCard;
  theme: Theme;
}

const KEY = 'divecast-local-v1';

const EMPTY_EMERGENCY: EmergencyCard = {
  fullName: '', emergencyContactName: '', emergencyContactPhone: '', danMember: '',
  insuranceProvider: '', policyNumber: '', medicalNotes: ''
};

function initial(): LocalState {
  return { savedSiteSlugs: ['blue-heron-bridge', 'ginnie-springs'], emergency: EMPTY_EMERGENCY, theme: 'abyss' };
}

function load(): LocalState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const saved = { ...initial(), ...(JSON.parse(raw) as Partial<LocalState>) };
    // Older builds stored 'dark' or 'light'
    if (!THEMES.some((t) => t.id === saved.theme)) saved.theme = 'abyss';
    return saved;
  } catch {
    return initial();
  }
}

let state: LocalState = load();
const listeners = new Set<() => void>();

export function setState(update: (s: LocalState) => LocalState) {
  state = update(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: keep working in memory */
  }
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useLocal<T>(select: (s: LocalState) => T): T {
  const cache = useRef<{ state: LocalState; value: T } | null>(null);
  const get = () => {
    if (!cache.current || cache.current.state !== state) cache.current = { state, value: select(state) };
    return cache.current.value;
  };
  return useSyncExternalStore(subscribe, get);
}

export function toggleSaved(slug: string) {
  setState((s) => ({
    ...s,
    savedSiteSlugs: s.savedSiteSlugs.includes(slug) ? s.savedSiteSlugs.filter((i) => i !== slug) : [...s.savedSiteSlugs, slug]
  }));
}

export function setTheme(theme: Theme) {
  const look = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  document.documentElement.dataset.theme = look.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', look.color);
  setState((s) => ({ ...s, theme: look.id }));
}
