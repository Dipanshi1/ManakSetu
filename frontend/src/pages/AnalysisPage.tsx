import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  Lightbulb,
  ListChecks,
  Loader2,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { TopNav } from '@/components/TopNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRouter, type AnalysisTab } from '@/router';
import {
  getAnalysisById,
  analysisStatusConfig,
  getRelationshipsByAnalysisId,
  getEvidenceChainsByAnalysisId,
  getRegulatoryRequirementsByAnalysisId,
  getStandardById,
} from '@/data/mockData';
import {
  isSeededAnalysisId,
  hasRealAnalysis,
  registerRealAnalysis,
} from '@/data/runtimeStore';
import { adaptAnalysis, statusBadge } from '@/services/adapter';
// api.js is plain JS bridged via allowJs — named exports resolve as implicit any.
import { getAnalysis, waitForAnalysis } from '@/services/api';
import type { Analysis } from '@/data/types';
import { formatDate } from '@/utils/format';
import { AnalysisOverviewTab } from './analysis/AnalysisOverviewTab';
import { AnalysisStandardsTab } from './analysis/AnalysisStandardsTab';
import { AnalysisRelationshipsTab } from './analysis/AnalysisRelationshipsTab';
import { AnalysisGapsTab } from './analysis/AnalysisGapsTab';
import { AnalysisCertificationTab } from './analysis/AnalysisCertificationTab';
import { AnalysisEvidenceTab } from './analysis/AnalysisEvidenceTab';

interface Props {
  analysisId: string;
  tab: AnalysisTab;
}

const tabs: { id: AnalysisTab; label: string; icon: typeof Sparkles }[] = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'standards', label: 'Standards', icon: FileText },
  { id: 'relationships', label: 'Relationships', icon: GitBranch },
  { id: 'gaps', label: 'Specification Quality', icon: ListChecks },
  { id: 'certification', label: 'Certification', icon: ShieldCheck },
  { id: 'evidence', label: 'Evidence', icon: ScrollText },
];

export function AnalysisPage({ analysisId, tab }: Props) {
  const { navigate } = useRouter();
  const [mobileTabOpen, setMobileTabOpen] = useState(false);

  // Seeded demo records (an-001/002/003) render synchronously from the rich mocks
  // as guaranteed-good SIH showcases. Any other id is a real backend analysis:
  // fetch → poll to terminal → adapt → register in the runtime store (which the
  // mockData getters read first), then render the same UI with real data.
  const seeded = isSeededAnalysisId(analysisId);
  const isReal = !seeded;

  const [analysis, setAnalysis] = useState<Analysis | undefined>(() =>
    seeded || hasRealAnalysis(analysisId) ? getAnalysisById(analysisId) : undefined,
  );
  const [loading, setLoading] = useState<boolean>(isReal && !hasRealAnalysis(analysisId));
  const [progressLabel, setProgressLabel] = useState('Loading analysis…');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Seeded or already-registered real analyses need no fetch.
    if (seeded || hasRealAnalysis(analysisId)) {
      setAnalysis(getAnalysisById(analysisId));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProgressLabel('Loading analysis…');

    (async () => {
      try {
        // waitForAnalysis returns immediately if the analysis is already terminal,
        // otherwise polls (500 ms) up to the timeout. 120 s covers Render cold starts.
        const raw = await waitForAnalysis(
          analysisId,
          (a: any) => {
            if (!cancelled) setProgressLabel(statusBadge(a?.status).label + '…');
          },
          120000,
        );
        if (cancelled) return;
        const bundle = adaptAnalysis(raw);
        registerRealAnalysis(bundle);
        setAnalysis(bundle.analysis);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        // Fall back to a one-shot fetch so a genuinely-missing id shows "not found"
        // rather than a timeout error.
        try {
          const raw = await getAnalysis(analysisId);
          if (cancelled) return;
          const bundle = adaptAnalysis(raw);
          registerRealAnalysis(bundle);
          setAnalysis(bundle.analysis);
          setLoading(false);
          return;
        } catch {
          if (cancelled) return;
        }
        setError(
          e?.message?.includes('timeout')
            ? 'The analysis service is taking longer than expected (it may be waking from sleep). Please retry.'
            : 'Could not load this analysis. It may still be processing, or the service is unavailable.',
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisId, seeded, reloadKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 dark:bg-[#090D16]">
        <TopNav variant="app" />
        <div className="container-app py-24 text-center">
          <Loader2 size={30} className="mx-auto mb-4 animate-spin text-teal-600" />
          <p className="text-sm font-medium text-ink-900 dark:text-white">{progressLabel}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink-400 dark:text-slate-400">
            Waking the analysis service if needed (the first run can take ~50s), then
            extracting requirements and matching BIS standards.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ivory-50 dark:bg-[#090D16]">
        <TopNav variant="app" />
        <div className="container-app py-20 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-100">
            <AlertTriangle size={24} className="text-warning-600" />
          </div>
          <p className="text-sm font-medium text-ink-900 dark:text-white">Couldn't load analysis</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-400 dark:text-slate-400">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
            <Button variant="secondary" onClick={() => navigate({ name: 'workspace' })}>
              Back to Workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-ivory-50">
        <TopNav variant="app" />
        <div className="container-app py-20 text-center">
          <p className="text-sm text-ink-500">Analysis not found.</p>
          <Button variant="secondary" onClick={() => navigate({ name: 'workspace' })} className="mt-4">
            Back to Workspace
          </Button>
        </div>
      </div>
    );
  }

  const status = analysisStatusConfig[analysis.status];
  const rels = getRelationshipsByAnalysisId(analysis.id);
  const evChains = getEvidenceChainsByAnalysisId(analysis.id);
  const regRequirements = getRegulatoryRequirementsByAnalysisId(analysis.id);
  const activeTab = tab || 'overview';

  const tabBadges: Partial<Record<AnalysisTab, number>> = {
    standards: analysis.standardsIdentified,
    relationships: rels.length,
    gaps: analysis.gapsFound,
    certification: analysis.certificationsRequired || regRequirements.length,
    evidence: evChains.length,
  };





  const forceRefreshAnalysis = async () => {
    if (!isReal) return;
    try {
      const raw = await getAnalysis(analysisId);
      const bundle = adaptAnalysis(raw);
      registerRealAnalysis(bundle);
      setAnalysis(bundle.analysis);
    } catch (e) {
      console.error('Failed to refresh analysis', e);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalysisOverviewTab analysis={analysis} isReal={isReal} />;
      case 'standards':
        return <AnalysisStandardsTab analysis={analysis} isReal={isReal} onSyncComplete={forceRefreshAnalysis} />;
      case 'relationships':
        return <AnalysisRelationshipsTab analysis={analysis} isReal={isReal} />;
      case 'gaps':
        return <AnalysisGapsTab analysisId={analysis.id} analysis={analysis} onSyncComplete={forceRefreshAnalysis} />;
      case 'certification':
        return <AnalysisCertificationTab analysis={analysis} />;
      case 'evidence':
        return <AnalysisEvidenceTab analysis={analysis} />;
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50 text-ink-900 dark:bg-[#090D16] dark:text-slate-100">
      <TopNav variant="app" />

      <div className="container-app py-6">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate({ name: 'workspace' })}
          className="mb-4 flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft size={15} />
          Workspace
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-ink-900 dark:text-white">{analysis.title}</h1>
                <Badge variant={status.variant} icon={
                  analysis.status === 'completed' ? <CheckCircle2 size={11} /> : analysis.status === 'processing' ? <Clock size={11} /> : undefined
                }>
                  {status.label}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400 dark:text-slate-400">
                <span>{analysis.category}</span>
                <span>·</span>
                <span>{formatDate(analysis.createdAt)}</span>
                <span>·</span>
                <span>{analysis.documentCount} document{analysis.documentCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <Button variant="secondary" size="sm" leftIcon={<ScrollText size={15} />} onClick={() => navigate({ name: 'reports' })}>
              Export Report
            </Button>
          </div>
        </div>

        {/* Sub-navigation */}
        <div className="mb-6">
          {/* Desktop tabs */}
          <div className="hidden border-b border-ink-200 sm:block dark:border-slate-800">
            <div className="flex gap-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                const badge = tabBadges[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate({ name: 'analysis', analysisId: analysis.id, tab: t.id })}
                    className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-ink-900 text-ink-900 dark:border-teal-400 dark:text-white font-semibold'
                        : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon size={15} />
                    {t.label}
                    {badge !== undefined && badge > 0 && (
                      <span className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
                        isActive ? 'bg-ink-900 text-white dark:bg-teal-700' : 'bg-ink-100 text-ink-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>


          {/* Mobile tab selector */}
          <div className="sm:hidden">
            <button
              onClick={() => setMobileTabOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700"
            >
              <span className="flex items-center gap-2">
                {(() => {
                  const activeT = tabs.find((t) => t.id === activeTab);
                  const Icon = activeT?.icon;
                  return Icon ? <Icon size={15} /> : null;
                })()}
                {tabs.find((t) => t.id === activeTab)?.label}
              </span>
              <ChevronDown />
            </button>
            {mobileTabOpen && (
              <div className="mt-1 rounded-lg border border-ink-200 bg-white p-1 shadow-card">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        navigate({ name: 'analysis', analysisId: analysis.id, tab: t.id });
                        setMobileTabOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                        activeTab === t.id ? 'bg-ivory-100 font-medium text-ink-900' : 'text-ink-600'
                      }`}
                    >
                      <Icon size={15} />
                      {t.label}
                      {tabBadges[t.id] !== undefined && tabBadges[t.id]! > 0 && (
                        <span className="ml-auto badge-neutral">{tabBadges[t.id]}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className="pb-12 animate-fade" key={activeTab}>
          {analysis.status === 'completed' ? (
            renderTab()
          ) : analysis.status === 'processing' ? (
            <Card padding="lg" className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Clock size={24} className="text-blue-500" />
              </div>
              <p className="text-sm font-medium text-ink-900">Analysis in progress</p>
              <p className="mt-1 text-sm text-ink-400">Standards identification typically takes 3–5 minutes.</p>
            </Card>
          ) : analysis.status === 'failed' ? (
            <Card padding="lg" className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error-100">
                <AlertTriangle size={24} className="text-error-600" />
              </div>
              <p className="text-sm font-medium text-ink-900">Analysis failed</p>
              <p className="mt-1 text-sm text-ink-400">
                {analysis.summary || 'The analysis could not be completed. Please try submitting again.'}
              </p>
              <Button onClick={() => navigate({ name: 'new-analysis' })} className="mt-4">
                Start a new analysis
              </Button>
            </Card>
          ) : (
            <Card padding="lg" className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ivory-100">
                <FileText size={24} className="text-ink-400" />
              </div>
              <p className="text-sm font-medium text-ink-900">Draft analysis</p>
              <p className="mt-1 text-sm text-ink-400">Upload documents and start analysis to see results.</p>
              <Button onClick={() => navigate({ name: 'new-analysis' })} className="mt-4">
                Add Documents
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
