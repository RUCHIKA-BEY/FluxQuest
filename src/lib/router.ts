import { useSyncExternalStore } from 'react';

export type RouteName = 'home' | 'predict' | 'lab' | 'variables' | 'results' | 'learn' | 'model';

export const ROUTES: { name: RouteName; path: string; label: string; short: string }[] = [
  { name: 'home', path: '/', label: 'Home', short: 'Home' },
  { name: 'predict', path: '/predict', label: 'Predict', short: 'Predict' },
  { name: 'lab', path: '/lab', label: '3D Lab', short: 'Lab' },
  { name: 'variables', path: '/variables', label: 'Variable Lab', short: 'Variables' },
  { name: 'results', path: '/results', label: 'Results', short: 'Results' },
  { name: 'learn', path: '/learn', label: 'Learn the Physics', short: 'Learn' },
  { name: 'model', path: '/model', label: 'Real Model Guide', short: 'Model' },
];

export interface Route {
  name: RouteName;
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const match = ROUTES.find((r) => r.path === path) ?? ROUTES[0];
  return { name: match.name, query: new URLSearchParams(qs) };
}

let current = parse();
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse();
  listeners.forEach((l) => l());
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

export function href(name: RouteName, query?: Record<string, string>) {
  const r = ROUTES.find((x) => x.name === name)!;
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  return `#${r.path}${qs}`;
}

export function navigate(name: RouteName, query?: Record<string, string>) {
  window.location.hash = href(name, query);
}
