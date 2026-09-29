import { useState, useEffect } from 'react';
import { API_ROOT, API_KEY } from '@/services/api';
import {
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Columns,
  ExternalLink,
  FileCheck2,
  FileText,
  FileWarning,
  HelpCircle,
  Layers,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X, Undo2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/router';
import {
  statusConfig,
  getStandardById,
  getMatchedRequirementsByAnalysisId,
} from '@/data/mockData';
import type {
  Analysis,
  HumanDecision,
  HumanReviewConfidence,
  Standard,
  StandardRelationshipRole,
} from '@/data/types';
import { StandardComparisonModal } from '@/components/standards/StandardComparisonModal';
import { isRetiredStandard, retrievalMatchLabel, RETRIEVAL_MATCH_TOOLTIP } from '@/services/adapter';

interface Props {
  analysis: Analysis;
  isReal?: boolean;
  onSyncComplete?: () => Promise<void>;
}

export function AnalysisStandardsTab({ analysis, isReal = false, onSyncComplete }: Props) {
  const { navigate } = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'primary' | 'normative' | 'testing' | 'issues'>('all');
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareA, setCompareA] = useState('std-10322');
  const [compareB, setCompareB] = useState('std-1944');
  const [isSyncing, setIsSyncing] = useState(false);

  const [bisSync, setBisSync] = useState<{
    last_synced_at: string | null;
    total_synced: number;
    error_count: number;
    in_progress?: boolean;
    planned?: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isReal) {
      // Simulate the sync check for seeded demos
      setTimeout(() => {
        if (!cancelled) setBisSync({ last_synced_at: null, total_synced: 0, error_count: 0 });
      }, 1000);
      return () => { cancelled = true; };
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const fetchStatus = () => {
      // Scope to this analysis so other tabs don't bleed through
      fetch(`${API_ROOT}/standards/bis-sync-status?analysis_id=${analysis.id}`, { headers: { 'X-API-Key': API_KEY } })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          if (cancelled) return;
          setBisSync(data);
          // Poll every 5s while the background sync is still running, so progress
          // shows as it happens; otherwise every 30s, as before.
          timer = setTimeout(fetchStatus, data?.in_progress ? 5_000 : 30_000);
        })
        .catch(() => {
          if (cancelled) return;
          setBisSync({ last_synced_at: null, total_synced: 0, error_count: 0 });
          timer = setTimeout(fetchStatus, 30_000);
        });
    };

    fetchStatus();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isReal, analysis.id]);

  const allMatchedRequirements = getMatchedRequirementsByAnalysisId(analysis.id);

  const handleManualSync = async () => {
    if (!analysis?.id || isSyncing) return;
    setIsSyncing(true);
    setBisSync((prev) => prev ? { ...prev, last_synced_at: null } : null);
    try {
      const resp = await fetch(`${API_ROOT}/analyses/${analysis.id}/sync-bis`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
      });
      const body = await resp.json().catch(() => ({}));
      if (body?.status === 'error' || body?.status === 'skipped') {
        console.warn('BIS sync:', body?.message);
        setIsSyncing(false);
        return;
      }
      // Wait for backend to finish writing results, then refresh both status and analysis
      setTimeout(async () => {
        try {
          const r = await fetch(`${API_ROOT}/standards/bis-sync-status?analysis_id=${analysis.id}`, { headers: { 'X-API-Key': API_KEY } });
          if (r.ok) setBisSync(await r.json());
        } catch {}
        // Re-fetch the full analysis so standards cards reflect any status/amendment changes
        try { await onSyncComplete?.(); } catch {}
        setIsSyncing(false);
      }, 5000);
    } catch {
      setIsSyncing(false);
    }
  };

  const matchedStandards = analysis.matchedStandardIds
    .map((id) => getStandardById(id))
    .filter((s): s is Standard => s !== undefined);


  // Local state for officer human decisions on standards
  // Extract decisions from the live backend analysis
  const [decisions, setDecisions] = useState<Record<string, HumanDecision>>(() => {
    const initial: Record<string, HumanDecision> = {};
    if (analysis.standard_decisions) {
      for (const [id, decisionObj] of Object.entries(analysis.standard_decisions)) {
        initial[id] = (decisionObj as any).decision;
      }
    } else {
      // Mock defaults for seeded analysis
      initial['std-10322'] = 'accepted';
      initial['std-15885'] = 'accepted';
      initial['std-16107'] = 'accepted';
      initial['std-60529'] = 'accepted';
      initial['std-14700'] = 'reviewed';
      initial['std-1944'] = 'reviewed';
      initial['std-sp-72'] = 'accepted';
    }
    return initial;
  });

  const handleDecision = async (stdId: string, decision: HumanDecision) => {
    const prevDecision = decisions[stdId];
    setDecisions((prev) => ({ ...prev, [stdId]: decision }));
    try {
      const { patchStandardDecision } = await import('@/services/api');
      await patchStandardDecision(analysis.id, stdId, decision);

      // Mutate the global analysis object so the state persists if the user switches tabs and comes back
      if (!analysis.standard_decisions) {
        analysis.standard_decisions = {};
      }
      if (!analysis.standard_decisions[stdId]) {
        analysis.standard_decisions[stdId] = { decision, notes: '' };
      } else {
        analysis.standard_decisions[stdId].decision = decision;
      }
    } catch (err) {
      console.error('Failed to save decision:', err);
      // Revert on error
      if (prevDecision) {
        setDecisions((prev) => ({ ...prev, [stdId]: prevDecision }));
      } else {
        setDecisions((prev) => {
          const next = { ...prev };
          delete next[stdId];
          return next;
        });
      }
    }
  };

  const filtered = matchedStandards.filter((s) => {
    if (
      search &&
      !s.title.toLowerCase().includes(search.toLowerCase()) &&
      !s.number.toLowerCase().includes(search.toLowerCase()) &&
      !s.summary.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (filter === 'rejected') return decisions[s.id] === 'rejected';

    // Hide rejected standards from other tabs (except 'all')
    if (decisions[s.id] === 'rejected' && filter !== 'all') {
      return false;
    }

    if (filter === 'primary') return s.relationshipRole === 'primary';
    if (filter === 'issues') return s.status !== 'current' || s.reviewConfidence === 'needs-review';
    return true;
  });

  // Relationship label & badge renderer
  const renderRelationshipBadge = (role?: StandardRelationshipRole) => {
    switch (role) {
      case 'primary':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-teal-800 text-white px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase font-mono shadow-soft">
            Primary Code
          </span>
        );
      case 'normative':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 text-[11px] font-medium font-mono">
            Normative Reference
          </span>
        );
      case 'testing':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 text-[11px] font-medium font-mono">
            Testing Protocol
          </span>
        );
      case 'safety':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[11px] font-medium font-mono">
            Safety Standard
          </span>
        );
      case 'installation':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium font-mono">
            Design & Installation
          </span>
        );
      case 'related':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-ink-100 text-ink-700 border border-ink-200 px-2 py-0.5 text-[11px] font-medium font-mono">
            Related Reference
          </span>
        );
    }
  };

  // Human confidence status badge renderer
  const renderConfidenceBadge = (confidence?: HumanReviewConfidence) => {
    switch (confidence) {
      case 'high-confidence':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 border border-teal-200">
            <CheckCircle2 size={11} className="text-teal-600" />
            High confidence
          </span>
        );
      case 'needs-review':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-800 border border-warning-200">
            <AlertTriangle size={11} className="text-warning-600" />
            Needs review
          </span>
        );
      case 'insufficient-evidence':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-error-50 px-2 py-0.5 text-[11px] font-semibold text-error-800 border border-error-200">
            <ShieldAlert size={11} className="text-error-600" />
            Insufficient evidence
          </span>
        );
      default:
        return null;
    }
  };

  const mainStandards = filtered.filter((s) => !isRetiredStandard(s));
  const retiredStandards = filtered.filter(isRetiredStandard);

  // superseded_by is an ID in the seeded demos but a designation such as
  // "IS 302 : Part 2 : Sec 40" from the backend, while the successor's number
  // carries its year ("…:2021"). Resolve against this analysis's standards only.
  const designationKey = (d: string) => d.replace(/\s+/g, '').toLowerCase().replace(/:(19|20)\d{2}$/, '');
  const findSuccessor = (supersededBy: string): Standard | undefined => {
    const byId = matchedStandards.find((s) => s.id === supersededBy);
    if (byId) return byId;
    const key = designationKey(supersededBy);
    return matchedStandards.find((s) => designationKey(s.number) === key) || getStandardById(supersededBy);
  };

  const renderStandardCard = (standard: Standard) => {
    const isRejected = decisions[standard.id] === 'rejected';
    if (isRejected) {
      return (
        <div key={standard.id} className="opacity-60 bg-ivory-50 border border-ink-200 rounded-lg p-3 flex justify-between items-center transition-opacity hover:opacity-100">
          <div>
            <span className="font-mono text-[11px] font-semibold text-ink-500 line-through mr-2">{standard.number}</span>
            <span className="text-sm text-ink-400 line-through">{standard.title}</span>
          </div>
          <button onClick={() => handleDecision(standard.id, 'accepted')} className="text-[11px] font-semibold text-ink-500 hover:text-ink-800 flex items-center gap-1 bg-ivory-100 px-2 py-1 rounded">
            <Undo2 size={12} /> Undo Reject
          </button>
        </div>
      );
    }

    const status = statusConfig[standard.status];
    const hasIssue = standard.status !== 'current';
    const retired = isRetiredStandard(standard);
    // A retired standard is never presented as the primary code.
    const role = retired && standard.relationshipRole === 'primary' ? 'related' : standard.relationshipRole;
    const isPrimary = role === 'primary';
    // Unsaved decisions display as accepted, except on a retired standard, where
    // that would read as an endorsement nobody made.
    const decision = decisions[standard.id] || (retired ? undefined : 'accepted');
    const successor = standard.supersededBy ? findSuccessor(standard.supersededBy) : undefined;
    // The BIS sync can store portal remarks ("DecidedbyCouncil") in superseded_by;
    // only an unresolved value that reads as a designation is shown as a successor.
    const successorText = standard.supersededBy && /^\s*(IS|IEC|ISO|SP)\b[^\d]*\d/i.test(standard.supersededBy)
      ? standard.supersededBy
      : undefined;
    const matchLabel = retrievalMatchLabel(standard.applicabilityScore);

    const standardReqs = allMatchedRequirements.filter(
      (req) => req.standardId === standard.id ||
               req.standardIds?.includes(standard.id) ||
               req.standardCode.includes(standard.number.split(' ')[1] || '')
    );

    return (
      <Card
        key={standard.id}
        padding="lg"
        className={`transition-all ${
          retired
            ? 'bg-ivory-50 border-dashed border-ink-300'
            : isPrimary
            ? 'bg-white border-teal-300 ring-1 ring-teal-500/10 shadow-soft'
            : 'bg-white border-ink-200 shadow-soft'
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Header row of standard item */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                  isPrimary
                    ? 'bg-ink-900 text-teal-400'
                    : hasIssue
                    ? 'bg-warning-100 text-warning-800'
                    : 'bg-ivory-100 text-ink-700'
                }`}
              >
                {hasIssue ? <FileWarning size={18} /> : <BookMarked size={18} />}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => navigate({ name: 'standard', standardId: standard.id, analysisId: analysis.id })}
                    className="text-base font-semibold text-ink-900 hover:text-teal-700 flex items-center gap-1.5 font-mono"
                  >
                    {standard.number}
                    <ExternalLink size={13} className="text-ink-400" />
                  </button>
                  {renderRelationshipBadge(role)}
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {renderConfidenceBadge(standard.reviewConfidence)}
                  {standard.regulatory && (
                    <Badge variant="blue" icon={<ShieldCheck size={11} />}>
                      Regulatory Order
                    </Badge>
                  )}
                  {standard.isCertified && (
                    <Badge variant="teal" icon={<CheckCircle2 size={11} />}>
                      Scheme-I ISI
                    </Badge>
                  )}
                </div>


                <h3 className="mt-1 text-sm font-medium text-ink-800">{standard.title}</h3>
              </div>
            </div>

            {/* Retrieval match & decision buttons */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-ink-100">
              {!retired && (
                <div className="text-right" title={RETRIEVAL_MATCH_TOOLTIP}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 block font-sans">
                    Retrieval match
                  </span>
                  <span className="text-sm font-bold text-ink-900">
                    {matchLabel ?? '—'}
                  </span>
                </div>
              )}

              {/* Human Decision Buttons */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => handleDecision(standard.id, 'accepted')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    decision === 'accepted'
                      ? 'bg-success-600 text-white shadow-soft'
                      : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                  }`}
                >
                  <Check size={11} className="inline mr-0.5" />
                  Accept
                </button>
                <button
                  onClick={() => handleDecision(standard.id, 'reviewed')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    decision === 'reviewed'
                      ? 'bg-warning-500 text-white shadow-soft'
                      : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                  }`}
                >
                  <HelpCircle size={11} className="inline mr-0.5" />
                  Review
                </button>
                <button
                  onClick={() => handleDecision(standard.id, 'rejected')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    decision === 'rejected'
                      ? 'bg-error-600 text-white shadow-soft'
                      : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                  }`}
                >
                  <X size={11} className="inline mr-0.5" />
                  Reject
                </button>
              </div>
            </div>
          </div>

          {/* Structured Why it Applies Reasoning & Matched Requirements Badge */}
          <div className="rounded-lg border border-ink-100 bg-ivory-50/60 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <span className="font-semibold text-ink-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
                <Scale size={13} className="text-teal-700" />
                {retired ? 'Why it was retrieved:' : 'Why it applies to this procurement:'}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                {standardReqs.length > 0 && (
                  <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1 font-semibold">
                    <FileCheck2 size={11} />
                    {standardReqs.length} matched requirement{standardReqs.length !== 1 ? 's' : ''}
                  </span>
                )}
                {standard.evidenceAvailable && (
                  <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Evidence Available
                  </span>
                )}
              </div>
            </div>

            <p className="text-ink-700 leading-relaxed text-xs">
              {standard.whyApplies || standard.summary}
            </p>

            {standard.whyAppliesReasons && standard.whyAppliesReasons.length > 0 && (
              <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2 pt-2 border-t border-ink-200/50">
                {standard.whyAppliesReasons.map((r, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                    {r.matched ? (
                      <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-teal-600" />
                    ) : (
                      <AlertTriangle size={12} className="mt-0.5 shrink-0 text-warning-600" />
                    )}
                    <span>
                      <strong className="text-ink-800 font-medium">{r.category}:</strong>{' '}
                      <span className="text-ink-600">{r.description}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata & Actions footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-2.5 text-xs text-ink-500 font-mono">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Edition: {standard.edition} ({standard.revision})</span>
              <span>·</span>
              <span>Bureau: {standard.bureau} — {standard.section}</span>
              {standard.committee && (
                <>
                  <span>·</span>
                  <span>{standard.committee}</span>
                </>
              )}
              {standard.ministry && (
                <>
                  <span>·</span>
                  <span title={standard.ministry}>Gov</span>
                </>
              )}
              {false && (
                <>
                  <span>·</span>
                  <span title="International Classification for Standards">ICS: {standard.section}</span>
                </>
              )}
              {(successor || successorText) && (
                <>
                  <span>·</span>
                  {successor ? (
                    <span className="text-warning-700 font-semibold cursor-pointer hover:underline" onClick={() => navigate({ name: 'standard', standardId: successor.id, analysisId: analysis.id })}>
                       → Upgraded to {successor.number}
                    </span>
                  ) : (
                    <span className="text-warning-700 font-semibold">
                       → Upgraded to {successorText}
                    </span>
                  )}
                </>
              )}
              <span>·</span>
              {standard.pages > 0 && <span>{standard.pages} pages</span>}
              {standard.amendments && standard.amendments.length > 0 && (
                <>
                  <span>·</span>
                  <span className="text-ink-700">
                    {standard.amendments.map((a: any) => typeof a === 'string' ? a : `Amd ${(a.amendment_number || a.number)}` + (a.year ? ` (${a.year})` : '')).join(', ')}
                  </span>
                </>
              )}
              {standard.retrievedAt && (
                <>
                  <span>·</span>
                  <span>Verified: {standard.retrievedAt.slice(0, 10)}</span>
                </>
              )}
              {standard.bisSourceUrl && (
                <>
                  <span>·</span>
                  <a href={standard.bisSourceUrl === "https://standards.bis.gov.in" ? "https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/indian_standards/isdetails" : standard.bisSourceUrl} title="Copy the IS number and paste it in the BIS search portal" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">BIS Search Portal ↗</a>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCompareA(standard.id);
                  setCompareB(standard.supersededBy || 'std-1944');
                  setCompareModalOpen(true);
                }}
                className="font-sans font-medium text-ink-600 hover:text-ink-900 inline-flex items-center gap-1 text-xs"
              >
                <Columns size={12} /> Compare
              </button>
              <button
                onClick={() => navigate({ name: 'standard', standardId: standard.id, analysisId: analysis.id })}
                className="font-sans font-medium text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 text-xs"
              >
                View details & clauses <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* BIS Sync Status Bar */}
      {isReal && (
        <div className="flex items-center justify-between rounded-lg border border-ink-100 bg-white px-3 py-2 mb-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            {/* Status dot */}
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${
              isSyncing || bisSync?.in_progress ? 'bg-amber-400 animate-pulse' :
              bisSync?.last_synced_at ? 'bg-emerald-500' :
              'bg-ink-300'
            }`} />
            <span className="text-xs font-semibold text-ink-700">BIS Portal Sync</span>
            {bisSync === null && !isSyncing && (
              <span className="text-xs text-ink-400">Checking…</span>
            )}
            {isSyncing && (
              <span className="text-xs text-amber-600 font-medium">Syncing with BIS portal…</span>
            )}
            {!isSyncing && bisSync?.in_progress && (
              <span className="text-xs text-amber-600 font-medium">
                Checking with BIS portal… {bisSync.total_synced}{bisSync.planned ? ` of ${bisSync.planned}` : ''}
              </span>
            )}
            {!isSyncing && bisSync !== null && !bisSync.in_progress && (
              <>
                {bisSync.last_synced_at ? (
                  <span className="text-xs text-ink-400">
                    Updated {new Date(bisSync.last_synced_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </span>
                ) : (
                  <span className="text-xs text-ink-400 italic">Not yet synced</span>
                )}
                {bisSync.total_synced > 0 && (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                    {bisSync.total_synced} standard{bisSync.total_synced !== 1 ? 's' : ''} checked
                  </span>
                )}
                {bisSync.error_count > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    {bisSync.error_count} could not verify
                  </span>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-ivory-50 px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-ivory-100 hover:text-ink-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-ink-100 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex rounded-lg border border-ink-200 bg-white p-0.5">
            {[
              { id: 'all', label: `All Standards (${matchedStandards.length})` },
              { id: 'primary', label: 'Primary' },
              { id: 'issues', label: 'Needs Attention' },
              { id: 'rejected', label: 'Rejected' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === f.id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search IS number, title, keywords…"
            className="w-full rounded-lg border border-ink-200 bg-white py-1.5 pl-7 pr-3 text-sm text-ink-700 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none sm:w-64"
          />
        </div>
      </div>

      {/* Standards list */}
      <div className="space-y-3.5">
        {mainStandards.map(renderStandardCard)}
      </div>

      {/* Withdrawn / superseded standards — retrieved, but no longer citable */}
      {retiredStandards.length > 0 && (
        <div className="space-y-3.5 border-t border-dashed border-ink-300 pt-4">
          <div className="flex items-start gap-2">
            <FileWarning size={15} className="mt-0.5 shrink-0 text-warning-700" />
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Withdrawn / Superseded ({retiredStandards.length})
              </p>
              <p className="text-xs text-ink-500">
                Matched by catalogue search but no longer current. Shown for reference; not recommended for citation.
              </p>
            </div>
          </div>
          {retiredStandards.map(renderStandardCard)}
        </div>
      )}

      {/* Summary footer note */}
      <Card padding="md" className="mt-6 bg-ivory-100 border-ink-200">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-ink-600" />
          <div className="text-xs text-ink-700 leading-relaxed">
            <p className="font-semibold text-ink-900">Procurement Officer Advisory</p>
            <p className="mt-0.5">
              ManakSetu provides source-backed evidence and clause mapping to support your specification decisions.
              All recommendations require official review before final incorporation into Tender corrigenda or evaluation matrices.
            </p>
          </div>
        </div>
      </Card>

      {/* Standard Comparison Modal */}
      <StandardComparisonModal
        standardAId={compareA}
        standardBId={compareB}
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
      />
    </div>
  );
}


