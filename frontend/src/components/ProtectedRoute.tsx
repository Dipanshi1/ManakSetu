import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useRouter, routeToHash } from '@/router';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const { route, navigate } = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      const currentHash = routeToHash(route);
      const redirectTarget = currentHash.replace(/^#/, '') || '/workspace';
      navigate({ name: 'signin', redirect: redirectTarget });
    }
  }, [isAuthenticated, route, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
