import { useEffect, useState } from 'react';
import { DOMAINS, type Domain } from './types';

export type Route =
  | { name: 'status' }
  | { name: 'domain'; domain: Domain }
  | { name: 'body' }
  | { name: 'notFound' };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, ''); // '/hq'

export function parse(pathname: string): Route {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const seg = rest.replace(/^\/|\/$/g, '');
  if (seg === '' || seg === 'status') return { name: 'status' };
  if (seg === 'body') return { name: 'body' };
  const d = DOMAINS.find((x) => x === seg);
  if (d) return { name: 'domain', domain: d };
  return { name: 'notFound' };
}

export function navigate(to: string): void {
  window.history.pushState({}, '', `${BASE}/${to}`.replace(/\/+$/, '') || `${BASE}/`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}
