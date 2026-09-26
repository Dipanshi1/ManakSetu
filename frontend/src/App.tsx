import { useEffect } from 'react';
import { RouterProvider, useRouter } from '@/router';
import { ThemeProvider } from '@/theme/ThemeContext';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { HowItWorksPage } from '@/pages/HowItWorksPage';
import { SignInPage } from '@/pages/SignInPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { NewAnalysisPage } from '@/pages/NewAnalysisPage';
import { StandardsPage } from '@/pages/StandardsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { StandardDetailPage } from '@/pages/StandardDetailPage';
import { getBackendHealth } from '@/services/api';

function AppRouter() {
  const { route, navigate } = useRouter();
  const { isAuthenticated } = useAuth();

  // Redirect authenticated visitors away from signin to workspace
  useEffect(() => {
    if (route.name === 'signin' && isAuthenticated) {
      navigate({ name: 'workspace' });
    }
  }, [route.name, isAuthenticated, navigate]);

  switch (route.name) {
    case 'landing':
      return <LandingPage />;
    case 'how-it-works':
      return <HowItWorksPage />;
    case 'signin':
      return isAuthenticated ? null : <SignInPage />;
    case 'workspace':
      return (
        <ProtectedRoute>
          <WorkspacePage />
        </ProtectedRoute>
      );
    case 'new-analysis':
      return (
        <ProtectedRoute>
          <NewAnalysisPage />
        </ProtectedRoute>
      );
    case 'standards':
      return <StandardsPage />;
    case 'reports':
      return (
        <ProtectedRoute>
          <ReportsPage />
        </ProtectedRoute>
      );
    case 'analysis':
      return (
        <ProtectedRoute>
          <AnalysisPage analysisId={route.analysisId} tab={route.tab || 'overview'} />
        </ProtectedRoute>
      );
    case 'standard':
      return <StandardDetailPage standardId={route.standardId} />;
    default:
      return <LandingPage />;
  }
}

function App() {
  useEffect(() => {
    // Silently ping the backend to wake up the Render free instance
    getBackendHealth().catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <AppRouter />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;


