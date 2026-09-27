import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileText,
  HelpCircle,
  Keyboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './ui/Avatar';
import { useRouter, type Route } from '@/router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/auth/AuthContext';

interface TopNavProps {
  variant?: 'public' | 'app' | 'auth';
}

interface MockNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'review' | 'warning' | 'regulatory' | 'update';
  unread: boolean;
  route?: Route;
}

const mockNotifications: MockNotification[] = [
  {
    id: 'notif-1',
    title: 'Obsolete Standard Cited in NIT §4.2',
    description: 'Withdrawn IS 1944:1981 requires corrigendum to IS 10322 (Part 5/Sec 3).',
    time: '12m ago',
    type: 'warning',
    unread: true,
    route: { name: 'analysis', analysisId: 'an-001', tab: 'gaps' },
  },
  {
    id: 'notif-2',
    title: 'Specification Gap Flagged',
    description: 'Mandatory 10kV surge threshold missing in Technical Schedule §3.2.4.',
    time: '1h ago',
    type: 'review',
    unread: true,
    route: { name: 'analysis', analysisId: 'an-001', tab: 'gaps' },
  },
  {
    id: 'notif-3',
    title: 'MeitY CRS Regulatory Match',
    description: 'Compulsory registration verified for LED electronic controlgear.',
    time: '3h ago',
    type: 'regulatory',
    unread: false,
    route: { name: 'analysis', analysisId: 'an-001', tab: 'certification' },
  },
  {
    id: 'notif-4',
    title: 'BIS Reaffirmation Update',
    description: 'IS 10322 (Part 5/Sec 3):2012 reaffirmed in 2022 repository.',
    time: '1d ago',
    type: 'update',
    unread: false,
    route: { name: 'standard', standardId: 'std-10322' },
  },
];

export function TopNav({ variant }: TopNavProps) {
  const { route, navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // If explicitly 'auth', stay 'auth'. Otherwise, authenticated visitors get 'app' and unauthenticated get 'public'.
  const resolvedVariant = variant === 'auth' ? 'auth' : (isAuthenticated ? 'app' : 'public');
  const isPublic = resolvedVariant === 'public';
  const isAuth = resolvedVariant === 'auth';

  // Global shortcut for Search Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Public Navigation Links
  const publicNavLinks: { label: string; route: Route; active: boolean }[] = [
    { label: 'ManakSetu', route: { name: 'landing' }, active: route.name === 'landing' },
    { label: 'How It Works', route: { name: 'how-it-works' }, active: route.name === 'how-it-works' },
    { label: 'Standards', route: { name: 'standards' }, active: route.name === 'standards' || route.name === 'standard' },
  ];

  // Authenticated Navigation Links
  const appNavLinks: { label: string; route: Route; active: boolean }[] = [
    { label: 'Workspace', route: { name: 'workspace' }, active: route.name === 'workspace' || route.name === 'analysis' },
    { label: 'Standards', route: { name: 'standards' }, active: route.name === 'standards' || route.name === 'standard' },
    { label: 'Reports', route: { name: 'reports' }, active: route.name === 'reports' },
  ];

  const currentNavLinks = isPublic ? publicNavLinks : appNavLinks;
  const unreadCount = mockNotifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-ivory-50/90 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-[#090D16]/90">
      <div className="container-app flex h-14 items-center justify-between gap-4">
        {/* Left: Brand + Nav */}
        <div className="flex items-center gap-7">
          <button
            onClick={() => navigate(isPublic || isAuth ? { name: 'landing' } : { name: 'workspace' })}
            className="flex items-center text-left transition-opacity hover:opacity-85 focus:outline-none"
            aria-label="ManakSetu Home"
          >
            <Logo size="md" />
          </button>

          {/* Desktop Navigation */}
          {!isAuth && (
            <nav className="hidden items-center gap-1 md:flex">
              {currentNavLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  className={`relative px-3 py-1.5 text-xs font-medium transition-colors ${
                    item.active
                      ? 'text-white'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/70 rounded-md dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                  }`}
                >
                  {item.active && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 rounded-md bg-ink-900 shadow-soft -z-10 dark:bg-teal-700"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Right: Controls based on Public vs Authenticated */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Theme Toggle Button (Available everywhere) */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition-colors hover:border-ink-300 hover:bg-ivory-100 hover:text-ink-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun size={15} className="text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon size={15} className="text-ink-600 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {/* PUBLIC NAVIGATION CONTROLS */}
          {isPublic && (
            <>
              <button
                onClick={() => navigate({ name: 'signin' })}
                className="btn-ghost hidden px-3 py-1.5 text-xs font-medium sm:inline-flex"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate(isAuthenticated ? { name: 'new-analysis' } : { name: 'signin', redirect: '/new-analysis' })}
                className="btn-primary px-3.5 py-1.5 text-xs font-medium shadow-soft"
              >
                <Sparkles size={14} className="text-teal-300" />
                Analyze a tender
              </button>
            </>
          )}

          {/* AUTH PAGE CONTROLS (Sign In only) */}
          {isAuth && (
            <button
              onClick={() => navigate({ name: 'landing' })}
              className="btn-ghost px-3 py-1.5 text-xs font-medium"
            >
              Back to Home
            </button>
          )}

          {/* AUTHENTICATED APPLICATION CONTROLS */}
          {!isPublic && !isAuth && (
            <>
              {/* Quick Search Button (Command Palette) */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-500 shadow-soft transition-all hover:border-ink-300 hover:text-ink-700 sm:flex dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
                aria-label="Search standards and tenders"
              >
                <Search size={14} className="text-ink-400 dark:text-slate-500" />
                <span>Search standards, specifications…</span>
                <kbd className="inline-flex items-center rounded border border-ink-200 bg-ivory-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  ⌘K
                </kbd>
              </button>

              {/* Notification Popover Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setProfileOpen(false);
                  }}
                  className="btn-ghost relative rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal-600 ring-2 ring-ivory-50 dark:bg-teal-400 dark:ring-[#090D16]" />
                  )}
                </button>

                {/* Notification Dropdown Popover */}
                <AnimatePresence>
                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-ink-200 bg-white p-1 shadow-pop overflow-hidden dark:border-slate-800 dark:bg-[#111827]"
                      >
                        <div className="flex items-center justify-between border-b border-ink-100 px-3.5 py-2.5 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-ink-900 dark:text-white">Evaluation Alerts</span>
                            <span className="rounded-full bg-teal-50 px-1.5 py-0.2 text-[10px] font-mono font-bold text-teal-800 border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
                              {unreadCount} new
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setNotifOpen(false);
                              navigate({ name: 'workspace' });
                            }}
                            className="text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-400"
                          >
                            View all in Workspace
                          </button>
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y divide-ink-100 dark:divide-slate-800">
                          {mockNotifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => {
                                setNotifOpen(false);
                                if (notif.route) navigate(notif.route);
                              }}
                              className={`flex w-full items-start gap-2.5 p-3 text-left transition-colors hover:bg-ivory-50 dark:hover:bg-slate-800/60 ${
                                notif.unread ? 'bg-teal-50/20 dark:bg-teal-950/20' : ''
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {notif.type === 'warning' ? (
                                  <ShieldAlert size={14} className="text-error-600" />
                                ) : notif.type === 'review' ? (
                                  <AlertTriangle size={14} className="text-amber-600" />
                                ) : notif.type === 'regulatory' ? (
                                  <ShieldCheck size={14} className="text-blue-600" />
                                ) : (
                                  <CheckCircle2 size={14} className="text-teal-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-semibold text-ink-900 truncate dark:text-slate-100">{notif.title}</p>
                                  <span className="text-[10px] text-ink-400 font-mono shrink-0 dark:text-slate-500">{notif.time}</span>
                                </div>
                                <p className="text-[11px] text-ink-600 leading-snug mt-0.5 dark:text-slate-400">{notif.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* New Analysis Primary Button */}
              <button
                onClick={() => navigate({ name: 'new-analysis' })}
                className="btn-primary hidden px-3 py-1.5 text-xs font-medium sm:inline-flex shadow-soft"
              >
                <Plus size={15} />
                New Analysis
              </button>

              {/* User Profile Dropdown (Cleaned & Non-Duplicative) */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-transparent p-1 transition-colors hover:border-ink-200 hover:bg-white dark:hover:border-slate-800 dark:hover:bg-[#111827]"
                  aria-expanded={profileOpen}
                  aria-label="Open profile menu"
                >
                  <Avatar initials={user?.initials || 'PN'} size="sm" />
                  <ChevronDown size={13} className="hidden text-ink-400 sm:block dark:text-slate-500" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop overflow-hidden dark:border-slate-800 dark:bg-[#111827]"
                      >
                        {/* User Identity Header */}
                        <div className="border-b border-ink-100 px-3 py-2.5 dark:border-slate-800">
                          <p className="text-xs font-bold text-ink-900 dark:text-white">{user?.name || 'Priya Nair'}</p>
                          <p className="text-[11px] text-ink-500 dark:text-slate-400 font-medium">{user?.role || 'Lead Procurement Officer'}</p>
                          <p className="text-[10px] text-ink-400 font-mono dark:text-slate-500">{user?.division || 'Urban Infrastructure Division'}</p>
                        </div>

                        {/* Account & Preferences Items */}
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              alert(`Officer Profile: ${user?.name || 'Priya Nair'} (Demo Session)\nTechnical Evaluation testing under SIH 26108.`);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-100 hover:text-ink-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <User size={14} className="text-ink-400" />
                            Officer Profile
                          </button>
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              alert('Preferences: Notification threshold set to High Priority & Obsolete Citations.');
                            }}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-100 hover:text-ink-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Settings size={14} className="text-ink-400" />
                            Evaluation Preferences
                          </button>
                          <button
                            onClick={() => {
                              toggleTheme();
                              setProfileOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-100 hover:text-ink-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-ink-400" />}
                              Theme
                            </span>
                            <span className="font-mono text-[10px] text-ink-400 capitalize">{theme}</span>
                          </button>
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              setShortcutsModalOpen(true);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-100 hover:text-ink-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Keyboard size={14} className="text-ink-400" />
                            Keyboard Shortcuts
                          </button>
                        </div>

                        {/* Sign Out */}
                        <div className="border-t border-ink-100 pt-1 dark:border-slate-800">
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              logout();
                              navigate({ name: 'signin' });
                            }}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs text-error-600 hover:bg-error-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <LogOut size={14} />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          {!isAuth && (
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 md:hidden dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={16} /> : <div className="flex flex-col gap-1 w-3.5"><span className="h-0.5 w-full bg-current rounded" /><span className="h-0.5 w-full bg-current rounded" /></div>}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && !isAuth && (
        <div className="border-t border-ink-200 bg-ivory-50 px-6 py-4 md:hidden animate-in dark:border-slate-800 dark:bg-[#090D16]">
          {!isPublic && (
            <div className="mb-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400"
              >
                <Search size={14} />
                <span>Search standards, specifications…</span>
              </button>
            </div>
          )}
          <div className="space-y-1">
            {currentNavLinks.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(item.route);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  item.active
                    ? 'bg-ink-900 text-white font-semibold dark:bg-teal-700'
                    : 'text-ink-700 hover:bg-ink-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-ink-200 pt-3 flex gap-2 dark:border-slate-800">
            {isPublic ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate({ name: 'signin' });
                  }}
                  className="btn-secondary flex-1 py-1.5 text-xs"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(isAuthenticated ? { name: 'new-analysis' } : { name: 'signin', redirect: '/new-analysis' });
                  }}
                  className="btn-primary flex-1 py-1.5 text-xs"
                >
                  Analyze a tender
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate({ name: 'new-analysis' });
                }}
                className="btn-primary w-full py-1.5 text-xs"
              >
                <Plus size={14} /> New Analysis
              </button>
            )}
          </div>
        </div>
      )}

      {/* Command Palette Search Modal */}
      {searchOpen && (
        <SearchPalette onClose={() => setSearchOpen(false)} />
      )}

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShortcutsModalOpen(false)}>
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-xs dark:bg-black/60" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-xl border border-ink-200 bg-white p-5 shadow-pop dark:border-slate-800 dark:bg-[#111827]"
          >
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2">
                <Keyboard size={16} className="text-teal-700" />
                Keyboard Shortcuts
              </h3>
              <button onClick={() => setShortcutsModalOpen(false)} className="rounded p-1 text-ink-400 hover:bg-ink-100 dark:text-slate-500">
                <X size={16} />
              </button>
            </div>
            <div className="py-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-ink-100 dark:border-slate-800">
                <span className="text-ink-700 dark:text-slate-300 font-sans">Open Quick Search</span>
                <kbd className="rounded border border-ink-200 bg-ivory-100 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800 text-ink-600 dark:text-slate-300">⌘K / Ctrl+K</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-ink-100 dark:border-slate-800">
                <span className="text-ink-700 dark:text-slate-300 font-sans">Toggle Dark / Light Theme</span>
                <kbd className="rounded border border-ink-200 bg-ivory-100 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800 text-ink-600 dark:text-slate-300">T</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-ink-100 dark:border-slate-800">
                <span className="text-ink-700 dark:text-slate-300 font-sans">Close Active Modal / Drawer</span>
                <kbd className="rounded border border-ink-200 bg-ivory-100 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800 text-ink-600 dark:text-slate-300">ESC</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


function SearchPalette({ onClose }: { onClose: () => void }) {
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');

  const catalogItems = [
    { type: 'Standard', label: 'IS 10322 (Part 5/Sec 3):2012 — Luminaires: Road & Street Lighting', tag: 'Current · Mandatory', route: { name: 'standard', standardId: 'std-10322' } as Route },
    { type: 'Standard', label: 'IS 15885 (Part 2/Sec 13):2012 — AC/DC Supplied Controlgear for LED Modules', tag: 'Current · CRS Mandatory', route: { name: 'standard', standardId: 'std-15885' } as Route },
    { type: 'Standard', label: 'IS 16107 (Part 2/Sec 1):2012 — LED Luminaire Performance Requirements', tag: 'Current · Reaffirmed 2022', route: { name: 'standard', standardId: 'std-16107' } as Route },
    { type: 'Standard', label: 'IS 10500:2012 — Drinking Water Specification', tag: 'Current', route: { name: 'standard', standardId: 'std-10500' } as Route },
    { type: 'Standard', label: 'IS 456:2000 — Plain and Reinforced Concrete - Code of Practice', tag: 'Current', route: { name: 'standard', standardId: 'std-456' } as Route },
    { type: 'Analysis', label: 'LED Street Lighting — Urban Smart Highway NIT', tag: '7 Standards · 3 Issues', route: { name: 'analysis', analysisId: 'an-001' } as Route },
    { type: 'Analysis', label: 'Municipal Water Distribution Network — Zone 4', tag: '5 Standards · 1 Issue', route: { name: 'analysis', analysisId: 'an-002' } as Route },
    { type: 'Report', label: 'LED Street Lighting — Standards Compliance & Audit Brief', tag: 'PDF · Audit Ready', route: { name: 'reports' } as Route },
  ];

  const results = catalogItems.filter((r) =>
    r.label.toLowerCase().includes(query.toLowerCase()) || r.type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60" />
      <div
        className="relative w-full max-w-xl rounded-xl border border-ink-200 bg-white shadow-pop animate-in overflow-hidden dark:border-slate-800 dark:bg-[#111827]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 bg-ivory-50/50 dark:border-slate-800 dark:bg-[#090D16]/50">
          <Search size={17} className="text-ink-400 dark:text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search standards (IS codes), tenders, specification clauses…"
            className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
          />
          <button
            onClick={onClose}
            className="rounded border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-500 hover:bg-ivory-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            ESC
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-ink-700 dark:text-slate-300">No matching standards or analyses found</p>
              <p className="mt-1 text-xs text-ink-400 dark:text-slate-500">Try searching by IS code (e.g. "IS 10322") or keyword (e.g. "LED", "Water")</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigate(r.route);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ivory-100 group dark:hover:bg-slate-800/80"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-ink-100 text-ink-600 group-hover:bg-ink-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700">
                      {r.type}
                    </span>
                    <span className="truncate text-xs font-medium text-ink-800 dark:text-slate-200">{r.label}</span>
                  </div>
                  <span className="shrink-0 text-[11px] text-ink-400 dark:text-slate-500">{r.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-ink-100 bg-ivory-50 px-4 py-2 flex items-center justify-between text-[11px] text-ink-400 dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-500">
          <span>Tip: Press <strong>⌘K</strong> anytime to open search</span>
          <span>Requirement → Standard → Evidence</span>
        </div>
      </div>
    </div>

  );
}
