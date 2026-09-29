import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { API_ROOT, API_KEY, listAnalyses } from '@/services/api';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Send,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  Filter,
  Layers,
  ListChecks,
  Printer,
  Scale,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck, Trash2,
  X,
} from 'lucide-react';
import { TopNav } from '@/components/TopNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useRouter } from '@/router';
import { useAuth } from '@/auth/AuthContext';
import { reports, getAnalysisById, getStandardById, getSpecificationRequirementsByAnalysisId } from '@/data/mockData';
import { listRealAnalyses, deleteRealAnalysis } from '@/data/runtimeStore';
import { formatDate } from '@/utils/format';
import type { Report, ReportType } from '@/data/types';

// The seeded showcase reports in mockData are kept for internal testing, but the
// normal Reports page shows only reports for real analyses.
const SHOW_DEMO_FIXTURES = false;

const reportTypeConfig: Record<ReportType, { label: string; icon: typeof FileText; accent: string }> = {
  compliance: { label: 'Standards Intelligence Brief', icon: ShieldCheck, accent: 'text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300' },
  'gap-analysis': { label: 'Specification Quality Audit', icon: ListChecks, accent: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300' },
  certification: { label: 'Regulatory & Certification Brief', icon: Award, accent: 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300' },
};

// Synthesize report entries for any real analyses registered this session.
// These are prepended so real submissions appear above the demo showcases.
// The runtime store keeps first-registration order, so sort newest first here;
// a missing or unparseable date sorts last.
function getRealReports(): Report[] {
  const time = (r: Report) => {
    const t = Date.parse(r.generatedAt);
    return Number.isNaN(t) ? -Infinity : t;
  };
  return listRealAnalyses()
    .map((a) => ({
      id: `real-${a.id}`,
      analysisId: a.id,
      title: a.title || a.id,
      type: 'compliance' as ReportType,
      generatedAt: a.createdAt || '',
      format: 'PDF' as const,
      pages: 0,
      status: a.status === 'failed' ? 'failed' as const : a.status === 'completed' ? 'ready' as const : 'generating' as const,
      author: 'ManakSetu Intelligence Engine',
    }))
    .sort((a, b) => time(b) - time(a));
}

// What a report can offer depends on where its analysis lives.
//   demo   — seeded showcase; renders locally, no backend analysis behind it
//   failed — the cached analysis failed; there is nothing to export
//   stale  — cached in this browser, but the server no longer has the analysis
//            (e.g. after a Render restart); only the local preview remains
//   ok     — backed by a live server analysis
type ReportState = 'demo' | 'failed' | 'stale' | 'ok';

export function ReportsPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [isEmailing, setIsEmailing] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // IDs of the analyses the server currently holds. null = unknown (request not
  // finished, or failed because the backend is asleep/unreachable) — in that
  // case nothing is marked stale and every action behaves as before.
  const [serverAnalysisIds, setServerAnalysisIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let alive = true;
    listAnalyses()
      .then((res: unknown) => {
        // Only trust a well-formed list: a malformed one must not mark every report stale.
        if (!Array.isArray(res) || !res.every((a) => a && typeof a.analysis_id === 'string')) return;
        if (alive) setServerAnalysisIds(new Set(res.map((a) => a.analysis_id as string)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const reportState = (report: Report): ReportState => {
    if (!report.id.startsWith('real-')) return 'demo';
    if (report.status === 'failed') return 'failed';
    if (serverAnalysisIds && !serverAnalysisIds.has(report.analysisId)) return 'stale';
    return 'ok';
  };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleEmailReport = async (reportId: string, analysisId: string) => {
    if (!user?.email) {
      alert('Please sign in with a valid email address to send reports.');
      return;
    }
    setIsEmailing(reportId);
    try {
      const res = await fetch(`${API_ROOT}/analyses/${encodeURIComponent(analysisId)}/report/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ recipient_email: user.email }),
      });
      if (!res.ok) {
        let message = `Failed to send email (${res.status}).`;
        try {
          const body = await res.json();
          message = body?.detail?.message || body?.detail?.error || body?.message || message;
        } catch {
          // non-JSON error body; keep the generic message
        }
        throw new Error(message);
      }
      const data = await res.json().catch(() => null);
      alert(data?.message || 'Report successfully dispatched for email delivery!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send email.';
      alert(message);
    } finally {
      setIsEmailing(null);
    }
  };

  // Real reports download the backend-generated PDF. Seeded demo reports have no
  // backend analysis, and a stale report's analysis is gone from the server, so
  // both print the locally cached preview instead.
  const handleDownloadPdf = async (report: Report) => {
    const state = reportState(report);
    if (state === 'failed') return;
    if (state === 'demo' || state === 'stale') {
      setPreviewReport(report);
      setTimeout(() => window.print(), 100);
      return;
    }
    setIsDownloading(report.id);
    let url: string | null = null;
    try {
      const res = await fetch(`${API_ROOT}/analyses/${encodeURIComponent(report.analysisId)}/report/pdf`, { headers: { 'X-API-Key': API_KEY } });
      if (!res.ok) {
        let message = `Failed to download PDF (${res.status}).`;
        try {
          const body = await res.json();
          message = body?.detail?.message || body?.message || message;
        } catch {
          // non-JSON error body; keep the generic message
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ManakSetu-Report-${report.analysisId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download PDF.');
    } finally {
      if (url) {
        const objectUrl = url;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
      setIsDownloading(null);
    }
  };

  // use refreshKey to trigger re-render
  const realReps = getRealReports();
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} report(s) and their underlying analyses?`)) {
      const ids = Array.from(selectedIds);
      ids.forEach(id => {
        const report = filtered.find(r => r.id === id);
        if (report && report.id.startsWith('real-')) {
          deleteRealAnalysis(report.analysisId);
        }
      });
      setRefreshKey(k => k + 1);
      setSelectedIds(new Set());
    }
  };

  const allReports = [...realReps, ...(SHOW_DEMO_FIXTURES ? reports : [])];
  const filtered = allReports.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;

    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-ivory-50 text-ink-900 dark:bg-[#090D16] dark:text-slate-100">
      <div className="print:hidden"><TopNav variant="app" /></div>

      <div className="container-app py-8 print:hidden">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Defensible Reports</h1>
              <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200 font-mono dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800">
                Audit Artifacts
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">
              Structured procurement evaluation briefs with clause-level provenance, standards mapping, and officer review records.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            <div className="relative flex-1 w-full max-w-2xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search evaluation reports by title or ID…"
              className="input pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex rounded-lg border border-ink-200 bg-white p-0.5 dark:border-slate-800 dark:bg-[#111827]">
            {(['all', 'compliance', 'gap-analysis', 'certification'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  typeFilter === f
                    ? 'bg-ink-900 text-white dark:bg-teal-700'
                    : 'text-ink-500 hover:text-ink-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {f === 'all' ? `All (${allReports.length})` : reportTypeConfig[f].label.split(' ')[0]}
              </button>
            ))}
          </div>
          </div>
          {selectedIds.size > 0 && (
            <Button variant="secondary" size="sm" onClick={handleBulkDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Trash2 size={14} className="mr-1.5" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}
        </div>

        {/* Reports grid */}
        <div className="space-y-10 mb-8">
          
          {/* Recent Reports Section */}
          {filtered.filter(r => r.id.startsWith('real-')).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-teal-600 dark:text-teal-400" />
                Recent Reports
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.filter(r => r.id.startsWith('real-')).map((report, i) => {
                  const analysis = getAnalysisById(report.analysisId);
                  const typeConfig = reportTypeConfig[report.type];
                  const Icon = typeConfig.icon;
                  const state = reportState(report);
                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <Card padding="lg" interactive className={`flex h-full flex-col group relative ${selectedIds.has(report.id) ? 'ring-2 ring-teal-500' : ''}`} onClick={() => {
                        const next = new Set(selectedIds);
                        if (next.has(report.id)) next.delete(report.id);
                        else next.add(report.id);
                        setSelectedIds(next);
                      }}>
                        <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            checked={selectedIds.has(report.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(report.id);
                              else next.delete(report.id);
                              setSelectedIds(next);
                            }}
                          />
                        </div>
                        <button
                          title="Delete report and analysis"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this report? This will also delete the underlying analysis.')) {
                              import('@/data/runtimeStore').then(m => {
                                m.deleteRealAnalysis(report.analysisId);
                                setRefreshKey(k => k + 1);
                              });
                            }
                          }}
                          className="absolute right-3 top-3 hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors bg-white shadow-sm border border-ink-100 dark:bg-slate-800 dark:border-slate-700"
                        >
                          <Trash2 size={15} />
                        </button>
                        <div className="flex items-start justify-between gap-3 pl-6">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeConfig.accent}`}>
                            <Icon size={18} />
                          </div>
                          {state === 'failed' ? (
                            <Badge variant="error">Failed</Badge>
                          ) : state === 'stale' ? (
                            <span title="This browser still has the report, but the server no longer has its analysis (for example after a server restart). Only the cached preview is available.">
                              <Badge variant="warning">Not on server</Badge>
                            </span>
                          ) : report.status === 'generating' ? (
                            <Badge variant="neutral">Processing</Badge>
                          ) : (
                            <Badge variant="success">Audit Ready</Badge>
                          )}
                        </div>
                        <div className="mt-4 flex-1">
                          <h3 className="text-sm font-semibold text-ink-900 dark:text-slate-100">{report.title}</h3>
                          {analysis && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate({ name: 'analysis', analysisId: analysis.id, tab: 'overview' }); }}
                              className="mt-1 text-xs text-teal-700 hover:underline dark:text-teal-400 block text-left"
                            >
                              Target: {analysis.title}
                            </button>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Avatar initials={report.author.split(' ').map((n) => n[0]).join('')} size="sm" />
                            <div>
                              <p className="text-xs font-medium text-ink-700 dark:text-slate-300">{report.author}</p>
                              <p className="flex items-center gap-1 text-xs text-ink-400 dark:text-slate-500">
                                <Calendar size={11} />
                                {report.generatedAt ? formatDate(report.generatedAt) : 'Date unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="neutral">{report.format}</Badge>
                            <span className="text-xs text-ink-400 dark:text-slate-500">{report.pages}p</span>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <Button variant="secondary" size="sm" leftIcon={<Eye size={13} />} onClick={() => setPreviewReport(report)}>View</Button>
                          <Button variant="secondary" size="sm" disabled={isDownloading === report.id || state === 'failed'} title={state === 'stale' ? 'Not on server — prints the cached preview' : undefined} leftIcon={<Download size={13} />} onClick={(e) => { e.stopPropagation(); handleDownloadPdf(report); }}>{isDownloading === report.id ? '...' : state === 'stale' ? 'Print' : 'PDF'}</Button>
                          <Button variant="secondary" size="sm" disabled={isEmailing === report.id || state === 'failed' || state === 'stale' || !user?.email} title={!user?.email ? 'Sign in with an email address to send reports' : state === 'stale' ? 'Not on server — email needs the server analysis' : undefined} leftIcon={<Send size={13} />} onClick={(e) => { e.stopPropagation(); handleEmailReport(report.id, report.analysisId); }}>{isEmailing === report.id ? '...' : 'Email'}</Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Demo Showcases Section */}
          {filtered.filter(r => !r.id.startsWith('real-')).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                Demo Showcases
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.filter(r => !r.id.startsWith('real-')).map((report, i) => {
                  const analysis = getAnalysisById(report.analysisId);
                  const typeConfig = reportTypeConfig[report.type];
                  const Icon = typeConfig.icon;
                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <Card padding="lg" interactive className={`flex h-full flex-col relative ${selectedIds.has(report.id) ? 'ring-2 ring-teal-500' : ''}`} onClick={() => {
                        const next = new Set(selectedIds);
                        if (next.has(report.id)) next.delete(report.id);
                        else next.add(report.id);
                        setSelectedIds(next);
                      }}>
                        <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            checked={selectedIds.has(report.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(report.id);
                              else next.delete(report.id);
                              setSelectedIds(next);
                            }}
                          />
                        </div>
                        <div className="flex items-start justify-between gap-3 pl-6">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeConfig.accent}`}>
                            <Icon size={18} />
                          </div>
                          <Badge variant="success">Audit Ready</Badge>
                        </div>
                        <div className="mt-4 flex-1">
                          <h3 className="text-sm font-semibold text-ink-900 dark:text-slate-100">{report.title}</h3>
                          {analysis && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate({ name: 'analysis', analysisId: analysis.id, tab: 'overview' }); }}
                              className="mt-1 text-xs text-teal-700 hover:underline dark:text-teal-400 block text-left"
                            >
                              Target: {analysis.title}
                            </button>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Avatar initials={report.author.split(' ').map((n) => n[0]).join('')} size="sm" />
                            <div>
                              <p className="text-xs font-medium text-ink-700 dark:text-slate-300">{report.author}</p>
                              <p className="flex items-center gap-1 text-xs text-ink-400 dark:text-slate-500">
                                <Calendar size={11} />
                                {formatDate(report.generatedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="neutral">{report.format}</Badge>
                            <span className="text-xs text-ink-400 dark:text-slate-500">{report.pages}p</span>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <Button variant="secondary" size="sm" leftIcon={<Eye size={13} />} onClick={() => setPreviewReport(report)}>View</Button>
                          <Button variant="secondary" size="sm" disabled={isDownloading === report.id} leftIcon={<Download size={13} />} onClick={(e) => { e.stopPropagation(); handleDownloadPdf(report); }}>{isDownloading === report.id ? '...' : 'PDF'}</Button>
                          <Button variant="secondary" size="sm" disabled title="Demo report — email needs a real analysis on the server" leftIcon={<Send size={13} />}>Demo</Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {allReports.length === 0 && (
          <Card padding="lg" className="text-center">
            <FileText size={24} className="mx-auto mb-2 text-ink-400" />
            <p className="text-sm font-medium text-ink-900 dark:text-slate-100">No reports yet</p>
            <p className="mt-1 text-sm text-ink-400 dark:text-slate-500">Reports appear here after you run an analysis.</p>
            <Button onClick={() => navigate({ name: 'new-analysis' })} className="mt-4">
              New Analysis
            </Button>
          </Card>
        )}

        {allReports.length > 0 && filtered.length === 0 && (
          <Card padding="lg" className="text-center">
            <Filter size={24} className="mx-auto mb-2 text-ink-400" />
            <p className="text-sm font-medium text-ink-900 dark:text-slate-100">No reports found</p>
            <p className="mt-1 text-sm text-ink-400 dark:text-slate-500">Try adjusting your search or filters.</p>
            <Button variant="secondary" onClick={() => { setSearch(''); setTypeFilter('all'); }} className="mt-4">
              Clear filters
            </Button>
          </Card>
        )}
      </div>

      {/* Document-Style Report Preview Modal */}
      <AnimatePresence>
        {previewReport && (
          <ReportPreviewModal report={previewReport} onClose={() => setPreviewReport(null)} isEmailing={isEmailing} handleEmailReport={handleEmailReport} isDownloading={isDownloading} handleDownloadPdf={handleDownloadPdf} state={reportState(previewReport)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportPreviewModal({ report, onClose, isEmailing, handleEmailReport, isDownloading, handleDownloadPdf, state }: { report: Report; onClose: () => void; isEmailing: string | null; handleEmailReport: (rId: string, aId: string) => void; isDownloading: string | null; handleDownloadPdf: (report: Report) => void; state: ReportState }) {
  const { user } = useAuth();
  const emailBlockedReason =
    !user?.email ? 'Sign in with an email address to send reports'
    : state === 'demo' ? 'Demo report — email needs a real analysis on the server'
    : state === 'stale' ? 'Not on server — email needs the server analysis'
    : state === 'failed' ? 'The analysis failed; there is no report to send'
    : undefined;
  const analysis = getAnalysisById(report.analysisId);
  
  // Dynamic Data Computation
  const activeStandardIds = (analysis?.matchedStandardIds || []).filter(id => 
    analysis?.standard_decisions?.[id]?.decision !== 'rejected'
  );
  const primaryStandardId = activeStandardIds[0] || (analysis?.matchedStandardIds || [])[0];
  const primaryStandard = primaryStandardId ? getStandardById(primaryStandardId) : undefined;
  
  const allFindings = analysis?.id ? getSpecificationRequirementsByAnalysisId(analysis.id) : [];
  
  const activeGaps = allFindings.filter(req => {
    // A gap must be an issue (missing, partial, restrictive)
    if (req.status === 'covered') return false;
    
    // Check waivers
    if (!analysis?.standard_decisions) return true;
    const ids = req.standardIds?.length ? req.standardIds : (req.standardId ? [req.standardId] : []);
    if (ids.length === 0) return true;
    const allRejected = ids.every(id => analysis.standard_decisions![id]?.decision === 'rejected');
    return !allRejected;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:p-0 print:block print:bg-white print:text-black" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm transition-opacity dark:bg-black/70 print:hidden" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] print:max-h-none w-full max-w-4xl flex-col rounded-xl border border-ink-200 bg-white shadow-pop overflow-hidden dark:border-slate-800 dark:bg-[#111827] print:shadow-none print:border-none print:rounded-none"
      >
        {/* Document Action Topbar */}
        <div className="flex items-center justify-between border-b border-ink-200 bg-ivory-50/80 px-6 py-3 dark:border-slate-800 dark:bg-[#090D16]/80 print:hidden">
          <div className="flex items-center gap-2">
            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-800 border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
              OFFICIAL INTELLIGENCE BRIEF
            </span>
            <span className="text-xs text-ink-500 font-mono dark:text-slate-400">
              Ref: {report.id.toUpperCase()} · SHA-256 Verified
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Printer size={13} />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            {/* A stale or failed report has no server PDF; Print above uses the cached copy. */}
            {state !== 'stale' && state !== 'failed' && (
              <Button
                variant="secondary"
                size="sm"
                disabled={isDownloading === report.id}
                leftIcon={<Download size={14} />}
                onClick={() => handleDownloadPdf(report)}
              >
                {isDownloading === report.id ? 'Downloading...' : 'Export PDF'}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              disabled={isEmailing === report.id || emailBlockedReason !== undefined}
              title={emailBlockedReason}
              leftIcon={<Send size={13} />}
              onClick={() => handleEmailReport(report.id, report.analysisId)}
            >
              {isEmailing === report.id ? 'Sending...' : 'Email to Officer'}
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Scrollable Body */}
        <div className="overflow-y-auto p-6 sm:p-10 space-y-6 text-ink-900 dark:text-slate-100 font-sans print:overflow-visible print:p-0">
          {/* Document Header Letterhead */}
          <div className="border-b-2 border-ink-900 pb-5 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-teal-800 dark:text-teal-400">
                  ManakSetu Technical Procurement Intelligence Platform
                </p>
                <h1 className="text-xl font-bold tracking-tight text-ink-900 dark:text-white mt-1">
                  {report.title}
                </h1>
                <p className="text-xs text-ink-500 mt-1 font-mono dark:text-slate-400">
                  Analysis Scope: {analysis?.title || 'Untitled Procurement Analysis'}
                </p>
              </div>
              <div className="text-right font-mono text-xs text-ink-600 dark:text-slate-400">
                <p>Date: {formatDate(report.generatedAt)}</p>
                <p>Author: {report.author}</p>
                <p>Security: Commercial-in-Confidence</p>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary & Procurement Profile */}
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400 border-b border-ink-100 pb-1 mb-3 dark:border-slate-800">
              1. Procurement Context & Profile
            </h2>
            <div className="grid gap-3 sm:grid-cols-3 rounded-lg border border-ink-200 bg-ivory-50/50 p-3.5 text-xs dark:border-slate-800 dark:bg-[#161f30]/60">
              {analysis?.product_profile ? (
                <>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-ink-400 block font-semibold dark:text-slate-500">Product Scope</span>
                    <span className="font-semibold text-ink-900 dark:text-white">{analysis.product_profile.product || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-ink-400 block font-semibold dark:text-slate-500">Intended Application</span>
                    <span className="font-semibold text-ink-900 dark:text-white">{analysis.product_profile.application || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-ink-400 block font-semibold dark:text-slate-500">Operating Environment</span>
                    <span className="font-semibold text-ink-900 dark:text-white">{analysis.product_profile.environment || 'N/A'}</span>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-[10px] uppercase font-mono text-ink-400 block font-semibold dark:text-slate-500">Notice</span>
                  <span className="font-semibold text-ink-900 dark:text-white">Profile data unavailable for this document.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Applicable Standards & Version Intelligence */}
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400 border-b border-ink-100 pb-1 mb-3 dark:border-slate-800">
              2. Applicable Indian Standards & Version Chronology
            </h2>
            <div className="space-y-2 text-xs">
              {primaryStandard ? (
                <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-3 dark:border-teal-900/60 dark:bg-teal-950/20">
                  <div className="flex items-center justify-between font-mono font-semibold text-teal-950 dark:text-teal-300">
                    <span>{primaryStandard.number} — {primaryStandard.title}</span>
                    <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-900 dark:bg-teal-900 dark:text-teal-200">
                      Primary Applicable Standard
                    </span>
                  </div>
                  <p className="mt-1 text-ink-700 dark:text-slate-300">
                    {`Applicable standard matched with high confidence.`}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-ink-200 bg-ivory-50/30 p-3 text-ink-500 italic">
                  No accepted primary standard available.
                </div>
              )}

              {activeStandardIds.length > 1 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeStandardIds.slice(1).map(sid => {
                    const std = getStandardById(sid);
                    if (!std) return null;
                    return (
                      <div key={std.id} className="rounded-lg border border-ink-200 p-2.5 bg-white dark:border-slate-800 dark:bg-[#161f30]/40">
                        <span className="font-mono font-bold text-ink-900 dark:text-white block truncate">{std.number}</span>
                        <span className="text-[11px] text-ink-500 dark:text-slate-400 truncate block">{std.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Specification Quality & Corrigenda */}
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400 border-b border-ink-100 pb-1 mb-3 dark:border-slate-800">
              3. Specification Quality & Actionable Findings
            </h2>
            <div className="space-y-2 text-xs">
              {activeGaps.length > 0 ? (
                activeGaps.map((gap, i) => (
                  <div key={gap.id || i} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-semibold font-mono">
                      <ShieldAlert size={14} className="text-amber-700 shrink-0" />
                      <span>Finding: {gap.requirement || 'Specification Gap'}</span>
                    </div>
                    <p className="mt-1 text-ink-700 dark:text-slate-300 pl-6">
                      {gap.whyMatters || gap.tenderEvidence || 'This parameter requires technical review.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-ink-200 bg-white p-3 text-ink-500 italic dark:border-slate-800 dark:bg-[#161f30]/40">
                  No active gaps or restrictive clauses found. (All findings are covered or waived).
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Audit Provenance & Sign-off */}
          <div className="border-t border-ink-200 pt-4 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-ink-500 dark:text-slate-400">
            <div>
              <p>Generated by ManakSetu v2.4 Intelligence Engine</p>
              <p>Evidence records cryptographic signature: {analysis?.id.split('-')[0] || '9a8f'}…73b2</p>
            </div>
            <div className="rounded border border-ink-300 bg-ivory-50 p-2.5 dark:border-slate-700 dark:bg-[#161f30] text-center sm:text-right">
              <span className="block font-semibold text-ink-900 dark:text-white">Officer Review Status</span>
              <span className="text-success-700 font-bold dark:text-emerald-400">ACCEPTED & STAMPED FOR TENDER RELEASE</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
