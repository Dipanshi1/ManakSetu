import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'how-it-works' }
  | { name: 'signin'; redirect?: string }
  | { name: 'workspace' }
  | { name: 'new-analysis' }
  | { name: 'standards' }
  | { name: 'reports' }
  | { name: 'analysis'; analysisId: string; tab?: AnalysisTab }
  | { name: 'standard'; standardId: string; analysisId?: string };

export type AnalysisTab = 'overview' | 'standards' | 'relationships' | 'gaps' | 'certification' | 'evidence';

interface RouterContextValue {
  route: Route;
  navigate: (target: Route | string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

export function parseHash(rawHash: string = window.location.hash): Route {
  const hashString = rawHash.replace(/^#/, '') || '/';
  const [path, queryString] = hashString.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(queryString || '');

  if (parts.length === 0) return { name: 'landing' };
  if (parts[0] === 'how-it-works') return { name: 'how-it-works' };
  if (parts[0] === 'signin') {
    const redirect = params.get('redirect') || undefined;
    return { name: 'signin', redirect };
  }
  if (parts[0] === 'workspace') return { name: 'workspace' };
  if (parts[0] === 'new-analysis') return { name: 'new-analysis' };
  if (parts[0] === 'standards') return { name: 'standards' };
  if (parts[0] === 'reports') return { name: 'reports' };
  if (parts[0] === 'analysis' && parts[1]) {
    const tab = (parts[2] as AnalysisTab) || 'overview';
    return { name: 'analysis', analysisId: parts[1], tab };
  }
  if (parts[0] === 'standard' && parts[1]) {
    const analysisId = params.get('analysisId') || undefined;
    return { name: 'standard', standardId: decodeURIComponent(parts[1]), analysisId };
  }
  return { name: 'landing' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'landing':
      return '#/';
    case 'how-it-works':
      return '#/how-it-works';
    case 'signin':
      return route.redirect ? `#/signin?redirect=${encodeURIComponent(route.redirect)}` : `#/signin`;
    case 'workspace':
      return '#/workspace';
    case 'new-analysis':
      return '#/new-analysis';
    case 'standards':
      return '#/standards';
    case 'reports':
      return '#/reports';
    case 'analysis':
      return `#/analysis/${route.analysisId}${route.tab ? `/${route.tab}` : ''}`;
    case 'standard': {
      const encodedId = encodeURIComponent(route.standardId);
      return route.analysisId ? `#/standard/${encodedId}?analysisId=${route.analysisId}` : `#/standard/${encodedId}`;
    }
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((target: Route | string) => {
    if (typeof target === 'string') {
      const hash = target.startsWith('#') ? target : `#${target}`;
      window.location.hash = hash;
    } else {
      window.location.hash = routeToHash(target);
    }
  }, []);

  const value = useMemo(() => ({ route, navigate }), [route, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
