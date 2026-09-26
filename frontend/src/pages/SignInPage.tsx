import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { TopNav } from '@/components/TopNav';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/router';
import { useAuth } from '@/auth/AuthContext';

export function SignInPage() {
  const { navigate, route } = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('priya.nair@standiq.gov.in');
  const [password, setPassword] = useState('••••••••••••');

  const redirectTarget = route.name === 'signin' && route.redirect ? route.redirect : undefined;

  const handleSignIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    login(email);
    if (redirectTarget) {
      navigate(redirectTarget);
    } else {
      navigate({ name: 'workspace' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-ivory-50 text-ink-900 dark:bg-[#090D16] dark:text-slate-100">
      <TopNav variant="auth" />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Logo size="lg" showWordmark={false} className="mx-auto mb-4" />
            <div className="mb-2 flex justify-center">
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-mono font-medium text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
                Demo session
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">
              {redirectTarget ? 'Sign in to continue' : 'Sign in to continue to your StandIQ workspace'}
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@gov.in"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label mb-0" htmlFor="password">Password</label>
                <button type="button" className="text-xs text-teal-600 hover:text-teal-700">
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-500">
              <input type="checkbox" className="h-4 w-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500" defaultChecked />
              Keep me signed in for this prototype session
            </label>

            <Button type="submit" fullWidth size="lg" rightIcon={<ArrowRight size={18} />}>
              Sign In
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="hairline" />
            <span className="text-xs text-ink-400">or</span>
            <div className="hairline" />
          </div>

          <Button variant="secondary" fullWidth size="lg" onClick={() => handleSignIn()}>
            <ShieldCheck size={17} />
            Continue with Organization SSO
          </Button>

          <p className="mt-8 text-center text-xs text-ink-400">
            Prototype session for procurement evaluation testing.
          </p>
        </div>
      </div>
    </div>
  );
}
