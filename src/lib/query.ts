import { useSyncExternalStore } from 'react';

// A small cached-query layer: one fetch per key, shared across screens, refreshed on invalidate.

interface Entry {
  data?: unknown;
  error?: string;
  loading: boolean;
  stale: boolean;
}

const cache = new Map<string, Entry>();
const subs = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  subs.forEach((f) => f());
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

function run(key: string, fn: () => Promise<unknown>) {
  const entry = cache.get(key) ?? { loading: true, stale: false };
  entry.loading = true;
  entry.stale = false;
  cache.set(key, entry);
  fn()
    .then((d) => {
      entry.data = d;
      entry.error = undefined;
    })
    .catch((err: unknown) => {
      entry.error = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : 'Something went wrong';
    })
    .finally(() => {
      entry.loading = false;
      emit();
    });
}

export function invalidate(...prefixes: string[]) {
  for (const [k, e] of cache) if (prefixes.some((p) => k.startsWith(p))) e.stale = true;
  emit();
}

export function clearQueries() {
  cache.clear();
  emit();
}

export function useQuery<T>(key: string | null, fn: () => Promise<T>) {
  useSyncExternalStore(subscribe, () => version);
  if (key) {
    const e = cache.get(key);
    if (!e || (e.stale && !e.loading)) queueMicrotask(() => {
      const cur = cache.get(key);
      if (!cur || (cur.stale && !cur.loading)) run(key, fn);
    });
  }
  const entry = key ? cache.get(key) : undefined;
  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    loading: key ? !entry || (entry.loading && entry.data === undefined) : false,
    refetch: () => key && invalidate(key)
  };
}
