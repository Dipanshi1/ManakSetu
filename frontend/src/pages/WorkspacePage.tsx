import { motion } from 'motion/react';
import {
  Activity as ActivityIcon,
  ArrowRight,
  CheckCircle2, Trash2,
  Clock,
  FileStack,
  FileText,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { TopNav } from '@/components/TopNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useRouter } from '@/router';
import { listRealAnalyses, deleteRealAnalysis } from '@/data/runtimeStore';
import {
  analyses,
  analysisStatusConfig,
  getMemberById,
  recentActivity,
  workspaceMembers,
} from '@/data/mockData';
import { formatDate, timeAgo } from '@/utils/format';
import { useEffect, useState } from 'react';
import { adaptAnalysisSummary } from '@/services/adapter';
import { listAnalyses } from '@/services/api';
import type { Analysis } from '@/data/types';

// The seeded showcase analyses and activity feed in mockData are kept for
// internal testing, but the normal Workspace shows only real analyses.
const SHOW_DEMO_FIXTURES = false;

export function WorkspacePage() {
  const { navigate } = useRouter();

  // Track demos the user has explicitly dismissed, persisted across refreshes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenDemoIds, setHiddenDemoIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('standiq-hidden-demos');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} analysis/analyses?`)) {
      const ids = Array.from(selectedIds);
      ids.forEach(id => {
        if (['an-001','an-002','an-003','an-hindi','an-tamil'].includes(id)) {
          hideDemo(id);
        } else {
          deleteRealAnalysis(id);
        }
      });
      setRealRows(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    }
  };

  const hideDemo = (id: string) => {
    setHiddenDemoIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('standiq-hidden-demos', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleDeleteAnalysis = (id: string, isDemo: boolean) => {
    if (isDemo) {
      hideDemo(id);
    } else {
      if (confirm('Are you sure you want to delete this analysis?')) {
        deleteRealAnalysis(id);
        setRealRows(prev => prev.filter(r => r.id !== id));
      }
    }
  };

  // Real analyses from the live backend, merged ahead of the seeded demo showcases.
  // Cached analyses are already adapted Analysis objects; show them straight away
  // (and if the backend is unreachable) rather than waiting for the list call.
  const [realRows, setRealRows] = useState<Analysis[]>(() => listRealAnalyses());
  useEffect(() => {
    let alive = true;
    listAnalyses()
      .then((res) => {
        const backendList = Array.isArray(res) ? res : (res?.analyses || res?.items || res?.data || []);
        const backendAdapted = backendList.map(adaptAnalysisSummary);
        
        // Merge with locally stored analyses (localStorage resilience against Render DB wipes)
        const localList = listRealAnalyses();
        
        // Deduplicate by ID, preferring backend data if available
        const backendMap = new Map(backendAdapted.map(a => [a.id, a]));
        const merged = [...backendAdapted];
        for (const local of localList) {
          if (!backendMap.has(local.id)) {
            merged.push(local);
          }
        }
        
        if (alive) setRealRows(merged);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Merge real rows first; only show demos that haven't been hidden
  const visibleDemos = SHOW_DEMO_FIXTURES
    ? analyses.filter((m) => !realRows.some((r) => r.id === m.id) && !hiddenDemoIds.has(m.id))
    : [];
  const analysesList = [...realRows, ...visibleDemos];

  const completedAnalyses = analysesList.filter((a) => a.status === 'completed');
  const processingAnalyses = analysesList.filter((a) => a.status === 'processing');
  const draftAnalyses = analysesList.filter((a) => a.status === 'draft');

  // Backend list summaries carry no standard or certification counts; the
  // analyses cached in this browser do, so prefer those where available.
  const cachedAnalyses = listRealAnalyses();
  const cachedById = new Map(cachedAnalyses.map((a) => [a.id, a]));
  const countsFor = (a: Analysis) => cachedById.get(a.id) ?? a;
  const totalStandards = completedAnalyses.reduce((sum, a) => sum + countsFor(a).standardsIdentified, 0);
  const totalGaps = completedAnalyses.reduce((sum, a) => sum + countsFor(a).gapsFound, 0);
  const totalCerts = completedAnalyses.reduce((sum, a) => sum + countsFor(a).certificationsRequired, 0);
  // The Reports page lists one report per analysis cached in this browser.
  const totalReports = cachedAnalyses.length;

  return (
    <div className="min-h-screen bg-ivory-50 text-ink-900 dark:bg-[#090D16] dark:text-slate-100">
      <TopNav variant="app" />

      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Workspace</h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">
              {analysesList.length} {analysesList.length === 1 ? 'analysis' : 'analyses'} · {SHOW_DEMO_FIXTURES && `${workspaceMembers.length} team members · `}Defensible Procurement Intelligence
            </p>
          </div>
          <Button onClick={() => navigate({ name: 'new-analysis' })} leftIcon={<Plus size={16} />}>
            New Analysis
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Standards Identified', value: totalStandards, icon: <FileStack size={18} />, accent: 'text-teal-700 bg-teal-50 dark:bg-teal-950/70 dark:text-teal-300' },
            { label: 'Gaps Found', value: totalGaps, icon: <TrendingUp size={18} />, accent: 'text-warning-700 bg-warning-50 dark:bg-amber-950/70 dark:text-amber-300' },
            { label: 'Certifications Required', value: totalCerts, icon: <ShieldCheck size={18} />, accent: 'text-blue-700 bg-blue-50 dark:bg-blue-950/70 dark:text-blue-300' },
            { label: 'Reports Generated', value: totalReports, icon: <FileText size={18} />, accent: 'text-ink-600 bg-ivory-100 dark:bg-slate-800 dark:text-slate-300' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-ink-900 tabular-nums dark:text-white">{stat.value}</p>
                    <p className="mt-0.5 text-xs text-ink-400 dark:text-slate-400">{stat.label}</p>
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.accent}`}>
                    {stat.icon}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>


        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent analyses */}
          <div className="lg:col-span-2">
            <Card padding="none">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-ink-900">Recent Analyses</h2>
                  {selectedIds.size > 0 && (
                    <Button variant="secondary" size="sm" onClick={handleBulkDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                      <Trash2 size={14} className="mr-1.5" />
                      Delete Selected ({selectedIds.size})
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative hidden sm:block">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      placeholder="Filter…"
                      className="w-32 rounded-md border border-ink-200 bg-white py-1 pl-7 pr-2 text-xs text-ink-700 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <button className="btn-ghost px-2 py-1 text-xs">
                    <Filter size={13} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-ink-100">
                {analysesList.length === 0 && (
                  <div className="px-5 py-10 text-center">
                    <FileText size={22} className="mx-auto mb-2 text-ink-300" />
                    <p className="text-sm font-medium text-ink-700">No analyses yet</p>
                    <p className="mt-1 text-xs text-ink-400">Start a new analysis to see its results here.</p>
                    <Button size="sm" className="mt-4" onClick={() => navigate({ name: 'new-analysis' })} leftIcon={<Plus size={14} />}>
                      New Analysis
                    </Button>
                  </div>
                )}
                {analysesList.map((analysis) => {
                  const status = analysisStatusConfig[analysis.status];
                  // Demo IDs are the hardcoded mock IDs (an-001, an-002, an-003, an-hindi, an-tamil)
                  const isDemo = ['an-001','an-002','an-003','an-hindi','an-tamil'].includes(analysis.id);
                  return (
                    <div key={analysis.id} className="group relative flex w-full items-center border-b border-ink-100 last:border-0 hover:bg-ivory-50 transition-colors px-5 py-4 gap-4 cursor-pointer" onClick={() => navigate({ name: 'analysis', analysisId: analysis.id, tab: 'overview' })}>
                      <div className="shrink-0" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          checked={selectedIds.has(analysis.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(analysis.id);
                            else next.delete(analysis.id);
                            setSelectedIds(next);
                          }}
                        />
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ivory-100 text-ink-500">
                          {analysis.status === 'completed' ? (
                            <CheckCircle2 size={18} className="text-success-500" />
                          ) : analysis.status === 'processing' ? (
                            <Clock size={18} className="text-blue-500" />
                          ) : (
                            <FileText size={18} className="text-ink-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-ink-900">{analysis.title}</p>
                            {isDemo && <span className="shrink-0 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 uppercase tracking-wide">demo</span>}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-ink-400">
                            <span>{analysis.category}</span>
                            <span className="text-ink-200">·</span>
                            <span>{formatDate(analysis.createdAt)}</span>
                            {analysis.standardsIdentified > 0 && (
                              <>
                                <span className="text-ink-200">·</span>
                                <span>{analysis.standardsIdentified} standards</span>
                              </>
                            )}
                            {analysis.gapsFound > 0 && (
                              <>
                                <span className="text-ink-200">·</span>
                                <span className="text-warning-600">{analysis.gapsFound} gaps</span>
                              </>
                            )}
                          </div>
                        </div>

                        <Badge variant={status.variant}>{status.label}</Badge>
                        
                        <div className="shrink-0 flex items-center justify-center w-8">
                          <button
                            title={isDemo ? "Hide this demo" : "Delete analysis"}
                            onClick={(e) => { e.stopPropagation(); handleDeleteAnalysis(analysis.id, isDemo); }}
                            className="hidden group-hover:flex h-8 w-8 items-center justify-center rounded text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors bg-white shadow-sm border border-ink-100"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ArrowRight size={15} className="text-ink-300 group-hover:hidden" />
                        </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Team (mock members; demo only) */}
            {SHOW_DEMO_FIXTURES && (
            <Card padding="none">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-ink-900">Team</h2>
                <Users size={15} className="text-ink-400" />
              </div>
              <div className="divide-y divide-ink-100">
                {workspaceMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar initials={member.avatarInitials} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{member.name}</p>
                      <p className="truncate text-xs text-ink-400">{member.role}</p>
                    </div>
                    <span className="text-xs text-ink-400">{member.analysesCount}</span>
                  </div>
                ))}
              </div>
            </Card>
            )}

            {/* Activity */}
            <Card padding="none">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-ink-900">Recent Activity</h2>
                <ActivityIcon size={15} className="text-ink-400" />
              </div>
              <div className="divide-y divide-ink-100">
                {!SHOW_DEMO_FIXTURES && (
                  <p className="px-5 py-6 text-center text-xs text-ink-400">No recent activity yet.</p>
                )}
                {SHOW_DEMO_FIXTURES && recentActivity.map((activity) => {
                  const member = getMemberById(activity.memberId);
                  return (
                    <div key={activity.id} className="px-5 py-3">
                      <p className="text-sm text-ink-600">
                        <span className="font-medium text-ink-900">{member?.name}</span>{' '}
                        {activity.action}{' '}
                        <span className="text-ink-500">{activity.target}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">{timeAgo(activity.timestamp)}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* Drafts & processing summary */}
        {(draftAnalyses.length > 0 || processingAnalyses.length > 0) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {processingAnalyses.length > 0 && (
              <Card padding="md" className="border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  <p className="text-sm font-medium text-ink-700">
                    {processingAnalyses.length} analysis{processingAnalyses.length > 1 ? 'es' : ''} in progress
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink-400">You'll be notified when results are ready.</p>
              </Card>
            )}
            {draftAnalyses.length > 0 && (
              <Card padding="md" className="border-ink-200 bg-ivory-100">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-ink-400" />
                  <p className="text-sm font-medium text-ink-700">
                    {draftAnalyses.length} draft{draftAnalyses.length > 1 ? 's' : ''} awaiting documents
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink-400">Upload documents to begin analysis.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
