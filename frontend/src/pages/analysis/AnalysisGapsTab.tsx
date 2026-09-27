import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Columns,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  FileWarning,
  HelpCircle,
  History,
  Info,
  Lightbulb,
  ListChecks,
  PlusCircle,
  Scale,
  ScrollText,
  Trash2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/router';
import {
  getAnalysisById,
  getSpecificationRequirementsByAnalysisId,
  getStandardById,
} from '@/data/mockData';
import { isSeededAnalysisId } from '@/data/runtimeStore';
import { LED_IMPROVEMENT_SUGGESTIONS, LED_DEMO_TITLE_MARKER } from '@/data/ledDemoFixture';
import type {
  HumanDecision,
  HumanReviewConfidence,
  SpecificationRequirement,
  SpecificationRequirementStatus,
} from '@/data/types';

interface Props {
  analysisId: string;
  analysis?: any;
  onSyncComplete?: () => void;
}

export function AnalysisGapsTab({ analysisId, analysis, onSyncComplete }: Props) {
  const { navigate } = useRouter();
  const rawRequirements = getSpecificationRequirementsByAnalysisId(analysisId);
  const isReal = !isSeededAnalysisId(analysisId);

  // Detect the built-in LED street-lighting demo so we can show the AI improve panel.
  const _analysis = analysis || getAnalysisById(analysisId);
  const isLedDemo = analysisId === 'an-001' || (isReal && (_analysis.title?.includes(LED_DEMO_TITLE_MARKER) ?? false));

  const [showImprove, setShowImprove] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SpecificationRequirementStatus | 'all'>('all');
  
  // Local human review decisions
  // Extract decisions from the live backend analysis or local storage
  const [decisions, setDecisions] = useState<Record<string, HumanDecision>>(() => {
    const saved = localStorage.getItem(`decisions-${analysisId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    
    const initial: Record<string, HumanDecision> = {};
    if (_analysis?.findings) {
      for (const finding of _analysis?.findings || []) {
        if (finding.officer_decision) {
          initial[finding.requirement_id || finding.id] = finding.officer_decision as HumanDecision;
        }
      }
    }
    return initial;
  });

  useEffect(() => {
    localStorage.setItem(`decisions-${analysisId}`, JSON.stringify(decisions));
  }, [decisions, analysisId]);

  const handleDecision = async (reqId: string, decision: HumanDecision) => {
    const prevDecision = decisions[reqId];
    setDecisions((prev) => ({ ...prev, [reqId]: decision }));
    
    // We send reqId to the backend because the frontend doesn't have finding IDs.
    // The backend decisions endpoint is modified to accept reqId in place of finding_id.
    try {
      const { patchFindingDecision } = await import('@/services/api');
      await patchFindingDecision(analysisId, reqId, decision);
      
      if (!_analysis.finding_decisions) {
        _analysis.finding_decisions = {};
      }
      if (!_analysis.finding_decisions[reqId]) {
        _analysis.finding_decisions[reqId] = { decision, notes: '' };
      } else {
        _analysis.finding_decisions[reqId].decision = decision;
      }
      
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      console.error('Failed to save decision:', err);
      if (prevDecision) {
        setDecisions((prev) => ({ ...prev, [reqId]: prevDecision }));
      } else {
        setDecisions((prev) => {
          const next = { ...prev };
          delete next[reqId];
          return next;
        });
      }
    }
  };

  // Compute effective requirements by layering officer decisions over AI verdicts
  const effectiveRequirements = useMemo(() => {
    return rawRequirements
      .filter((req) => decisions[req.id] !== 'deleted')
      .map((req) => {
        const decision = decisions[req.id];
        let effectiveStatus = req.status;

        if (decision === 'accepted') {
          effectiveStatus = 'covered';
        } else if (decision === 'reviewed') {
          effectiveStatus = 'review';
        } else if (decision === 'rejected') {
          effectiveStatus = (req.status === 'conflicting' || req.status === 'restrictive') 
            ? req.status 
            : 'missing';
        }

        return {
          ...req,
          status: effectiveStatus,
          aiStatus: req.status, // Preserve original
          decision: decision || req.decision,
        };
      });
  }, [rawRequirements, decisions]);

  const [selectedReqId, setSelectedReqId] = useState<string | null>(effectiveRequirements[0]?.id || null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('general');

  // Reset tab when selecting a new requirement
  useEffect(() => {
    setActiveTab('general');
  }, [selectedReqId]);

  // Seeded demo ids keep their curated headline numbers; real analyses compute
  // the coverage strip and filter counts from the actual requirement verdicts.
  const total = effectiveRequirements.length;
  const coveredCount = effectiveRequirements.filter((r) => r.status === 'covered').length;
  const reviewCount = effectiveRequirements.filter((r) => r.status === 'review').length;
  const missingCount = effectiveRequirements.filter((r) => r.status === 'missing').length;
  const conflictingCount = effectiveRequirements.filter((r) => r.status === 'conflicting').length;
  const restrictiveCount = effectiveRequirements.filter((r) => r.status === 'restrictive').length;

  // For the top summary cards, we group general review and conflicting scope issues together
  // so the numbers add up correctly in the 4-column layout without hiding the conflicts.
  const summaryReviewCount = reviewCount + conflictingCount;
  const coveragePct = total ? Math.round((coveredCount / total) * 100) : 0;


  // Filter requirements
  const filteredRequirements = useMemo(() => {
    return effectiveRequirements.filter((req) => {
      if (search) {
        const q = search.toLowerCase();
        const matchReq = req.requirement.toLowerCase().includes(q);
        const matchStd = req.applicableStandard.toLowerCase().includes(q);
        const matchEv = req.tenderEvidence.toLowerCase().includes(q);
        if (!matchReq && !matchStd && !matchEv) return false;
      }
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [effectiveRequirements, search, statusFilter]);

  // Selected requirement in drawer
  const selectedReq = useMemo(() => {
    return effectiveRequirements.find((r) => r.id === selectedReqId) || effectiveRequirements[0];
  }, [effectiveRequirements, selectedReqId]);

  // Potential restrictiveness flagged items
  const restrictiveItems = useMemo(() => {
    return effectiveRequirements.filter((r) => r.status === 'restrictive');
  }, [effectiveRequirements]);

  // Status badge helper with explicit text
  const renderStatusBadge = (status: SpecificationRequirementStatus) => {
    switch (status) {
      case 'covered':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-success-50 text-success-800 border border-success-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <CheckCircle2 size={11} className="text-success-600" />
            Covered
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-warning-50 text-warning-800 border border-warning-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <HelpCircle size={11} className="text-warning-600" />
            Review
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-error-50 text-error-800 border border-error-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <X size={11} className="text-error-600" />
            Missing
          </span>
        );
      case 'conflicting':
        return (
          <span 
            className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 text-[11px] font-mono font-medium cursor-help"
            title="Scope Mismatch: The cited standard exists, but it covers a different product, material, or application."
          >
            <AlertTriangle size={11} className="text-purple-600" />
            Conflicting
          </span>
        );
      case 'restrictive':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <ShieldAlert size={11} className="text-amber-600" />
            Restrictive
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------------ */}
      {/* 1. HEADER & COVERAGE OVERVIEW                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b border-ink-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink-900 tracking-tight">
              Specification Quality
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Compare procurement requirements with applicable standards, regulations and available evidence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isLedDemo && (
              <Button
                variant={showImprove ? 'primary' : 'secondary'}
                size="sm"
                leftIcon={<Sparkles size={13} />}
                onClick={() => setShowImprove((v) => !v)}
              >
                AI Improve Specification
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ScrollText size={13} />}
              onClick={() => navigate({ name: 'analysis', analysisId, tab: 'evidence' })}
            >
              Evidence Workspace
            </Button>
          </div>
        </div>

        {/* Coverage Metrics Grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {/* Main Coverage Score */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-800 font-mono">
                Specification Coverage
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-bold font-mono text-teal-950">{coveragePct}%</span>
                <span className="text-[11px] text-teal-700">adequacy match</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-800 text-teal-200 font-mono font-bold text-sm">
              <FileCheck2 size={20} />
            </div>
          </div>

          {/* Covered Count */}
          <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-soft">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono">
              Requirements Covered
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-success-700">{coveredCount}</span>
              <span className="text-[11px] text-ink-500">fully specified</span>
            </div>
          </div>

          {/* Review Count */}
          <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-soft">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono">
              Review Recommended
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-warning-700">{summaryReviewCount}</span>
              <span className="text-[11px] text-ink-500">needs clarification</span>
            </div>
          </div>

          {/* Missing / Restrictive Count */}
          <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-soft">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono">
              Missing / Flagged
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-error-700">{missingCount} Missing</span>
              <span className="text-[11px] text-amber-800 font-medium">· {restrictiveCount} Restrictive</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* AI IMPROVE SPECIFICATION PANEL (LED demo only)                      */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {isLedDemo && showImprove && (
          <motion.div
            key="improve-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/60 to-white shadow-soft"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-teal-950 tracking-tight">AI Specification Improvement Suggestions</p>
                  <p className="text-[11px] text-teal-700 mt-0.5">
                    6 targeted improvements to strengthen this LED street-lighting procurement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImprove(false)}
                className="rounded-md p-1.5 text-teal-600 hover:bg-teal-100 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Suggestion list */}
            <div className="divide-y divide-teal-100/60">
              {LED_IMPROVEMENT_SUGGESTIONS.map((s, i) => (
                <div key={s.id} className="px-5 py-4">
                  <div className="flex gap-3">
                    {/* Index badge */}
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white text-[11px] font-bold font-mono mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Area tag + issue */}
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-900 font-mono uppercase tracking-wide shrink-0">
                          {s.area}
                        </span>
                      </div>
                      <p className="text-[12px] text-ink-700 leading-relaxed font-medium">
                        {s.whatToImprove}
                      </p>
                      {/* Why it matters */}
                      <div className="flex gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                        <AlertTriangle size={12} className="text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-800 leading-relaxed">{s.whyItMatters}</p>
                      </div>
                      {/* Suggested wording */}
                      <div className="rounded-lg bg-teal-50 border border-teal-100 px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider font-mono mb-1">Suggested clause wording</p>
                        <p className="text-[11px] text-teal-900 leading-relaxed italic">"{s.suggestedWording}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-teal-100 bg-teal-50/40 rounded-b-xl">
              <p className="text-[10px] text-teal-600 font-mono">
                ✦ Suggestions generated deterministically from IS 16107:2023, IS 10322 (Part 5/Sec 3), IS 16106, and IS 1944. No external AI service required.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* 2. POTENTIAL PROCUREMENT RESTRICTIVENESS ALERT                     */}
      {/* ------------------------------------------------------------------ */}
      {restrictiveItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <ShieldAlert size={18} />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-amber-950 uppercase tracking-wider font-mono text-[11px]">
                    Potential Procurement Restrictiveness
                  </h4>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 font-mono">
                    Flagged for review
                  </span>
                </div>
                <span className="text-[11px] text-amber-800 font-medium">
                  Qualitative assessment · Human review recommended
                </span>
              </div>

              <p className="mt-1 text-ink-700 leading-relaxed">
                {restrictiveItems[0].restrictivenessNote}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/60 pt-2 text-[11px] text-amber-900">
                <span>
                  <strong>Flagged Requirement:</strong> {restrictiveItems[0].requirement}{isLedDemo && ' (CCT 3950K–4050K)'}
                </span>
                <button
                  onClick={() => {
                    setSelectedReqId(restrictiveItems[0].id);
                    setIsDrawerOpen(true);
                  }}
                  className="font-semibold text-amber-900 underline hover:text-amber-950 inline-flex items-center gap-0.5"
                >
                  View recommended adjustment in inspector <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. REQUIREMENT MATRIX TABLE & DETAIL DRAWER                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Table Column (7 or 8 cols) */}
        <div className={`space-y-3 ${isDrawerOpen ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          {/* Table Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-ink-200 shadow-soft">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[10px] font-semibold uppercase text-ink-400 font-mono mr-1">
                Filter:
              </span>
              {[
                { id: 'all', label: `All (${total})` },
                { id: 'covered', label: `Covered (${coveredCount})` },
                { id: 'review', label: `Review (${reviewCount})` },
                { id: 'missing', label: `Missing (${missingCount})` },
                { id: 'restrictive', label: `Restrictive (${restrictiveCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`rounded px-2 py-0.5 text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-ink-900 text-white'
                      : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requirements…"
                className="rounded border border-ink-200 bg-ivory-50 py-1 pl-7 pr-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-teal-500 focus:bg-white focus:outline-none w-44"
              />
            </div>
          </div>

          {/* Requirement Matrix Table */}
          <div className="rounded-xl border border-ink-200 bg-white shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ink-100 bg-ivory-100/70 text-[10px] font-semibold uppercase tracking-wider text-ink-600 font-mono">
                    <th className="py-2.5 pl-4 pr-2">Requirement</th>
                    <th className="py-2.5 px-2">Tender Evidence</th>
                    <th className="py-2.5 px-2">Standard & Clause</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 font-mono">
                  {filteredRequirements.map((req) => {
                    const isSelected = selectedReqId === req.id && isDrawerOpen;
                    const isStandardRejected = (() => {
                      if (!_analysis?.standard_decisions) return false;
                      const ids = req.standardIds?.length ? req.standardIds : [req.standardId];
                      return ids.every(id => _analysis.standard_decisions![id]?.decision === 'rejected');
                    })();
                    
                    return (
                      <tr
                        key={req.id}
                        onClick={() => {
                          setSelectedReqId(req.id);
                          setIsDrawerOpen(true);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isStandardRejected ? 'opacity-40 bg-gray-50' : 
                          isSelected
                            ? 'bg-teal-50/50 hover:bg-teal-50/70'
                            : 'hover:bg-ivory-50/60'
                        }`}
                      >
                        {/* Requirement Name */}
                        <td className="py-3 pl-4 pr-2 font-sans font-semibold text-ink-900 max-w-[180px]">
                          <span className="line-clamp-2">{req.requirement}</span>
                        </td>

                        {/* Tender Evidence Excerpt */}
                        <td className="py-3 px-2 text-[11px] text-ink-600 max-w-[200px]">
                          <span className="line-clamp-2 italic font-sans">{req.tenderEvidence}</span>
                        </td>

                        {/* Standard & Clause */}
                        <td className="py-3 px-2 text-[11px]">
                          <span className="font-semibold text-teal-900 block truncate max-w-[140px]">
                            {req.applicableStandard}
                          </span>
                          <span className="text-ink-400 text-[10px] block truncate">
                            {req.clause}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-2 whitespace-nowrap">
                          {isStandardRejected ? (
                            <span className="inline-flex items-center gap-1 rounded bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 text-[11px] font-mono font-medium">
                              Waived
                            </span>
                          ) : (() => {
                            if (decisions[req.id] === 'accepted') return renderStatusBadge('covered');
                            if (decisions[req.id] === 'rejected') return renderStatusBadge('missing');
                            return renderStatusBadge(req.status);
                          })()}
                        </td>

                        {/* Action Link */}
                        <td className="py-3 pr-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReqId(req.id);
                              setIsDrawerOpen(true);
                            }}
                            className="font-sans font-medium text-teal-700 hover:text-teal-900 inline-flex items-center gap-0.5 text-xs"
                          >
                            Inspect <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 4. REQUIREMENT DETAIL DRAWER / INSPECTOR (Right side)             */}
        {/* ------------------------------------------------------------------ */}
        {isDrawerOpen && selectedReq && (
          <div className="lg:col-span-5 space-y-3">
            <Card padding="md" className="bg-white border-ink-200 shadow-soft h-full flex flex-col justify-between">
              <div className="space-y-3.5">
                {/* Header with Close */}
                <div className="border-b border-ink-100 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono">
                      Requirement Detail
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const isStandardRejected = (() => {
                          if (!_analysis?.standard_decisions) return false;
                          if (activeTab !== 'general') return _analysis.standard_decisions[activeTab]?.decision === 'rejected';
                          const ids = selectedReq.standardIds?.length ? selectedReq.standardIds : [selectedReq.standardId];
                          return ids.every(id => _analysis.standard_decisions![id]?.decision === 'rejected');
                        })();
                        if (isStandardRejected) {
                          return (
                            <span className="inline-flex items-center gap-1 rounded bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 text-[11px] font-mono font-medium">
                              Waived
                            </span>
                          );
                        }
                        if (decisions[selectedReq.id] === 'accepted') return renderStatusBadge('covered');
                        if (decisions[selectedReq.id] === 'rejected') return renderStatusBadge('missing');
                        return renderStatusBadge(selectedReq.status);
                      })()}
                      <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-ink-900 font-sans leading-snug">
                    {selectedReq.requirement}
                  </h3>
                </div>

                {/* Standard Selector Dropdown */}
                {selectedReq.standardIds && selectedReq.standardIds.length > 0 && (
                  <div className="mt-4 pb-4 border-b border-ink-100">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block mb-1.5">
                      Select Standard to View Details
                    </label>
                    <select
                      value={activeTab}
                      onChange={(e) => setActiveTab(e.target.value)}
                      className="w-full p-2 text-xs font-mono text-ink-900 border border-ink-200 rounded-lg bg-ivory-50/50 hover:bg-ivory-50 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors cursor-pointer"
                    >
                      <option value="general">General Summary</option>
                      {selectedReq.standardIds.map((sid) => {
                        const stdComp = selectedReq.standardCompliance?.[sid];
                        
                        // Extract a clean label without falling back to the comma-separated mega-string
                        // If it's a legacy UUID and no stdComp exists, just label it 'Legacy Standard'
                        let displayLabel = stdComp?.standard_label || 'Legacy Standard';
                        
                        if (!displayLabel) {
                           displayLabel = sid.length > 20 ? 'Legacy Standard' : sid;
                        }
                        
                        if (_analysis?.standard_decisions?.[sid]?.decision === 'rejected') {
                          displayLabel += ' (Waived)';
                        }
                        
                        return (
                          <option key={sid} value={sid}>
                            {displayLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Tab Content */}
                <div className="pt-2">
                  {activeTab === 'general' ? (
                    <div className="space-y-6">
                      {/* Why It Matters */}
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block mb-1">
                          Why this requirement matters
                        </span>
                        <p className="text-xs text-ink-700 leading-relaxed bg-ivory-50/70 p-2.5 rounded-lg border border-ink-100">
                          {selectedReq.whyMatters}
                        </p>
                      </div>

                      {/* Tender Document Evidence */}
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block mb-1">
                          Tender Evidence ({selectedReq.tenderSection})
                        </span>
                        <blockquote className="border-l-2 border-teal-500 pl-2.5 text-xs italic text-ink-800 bg-white p-2 rounded-r border border-ink-100 leading-relaxed font-mono text-[11px]">
                          {selectedReq.tenderEvidence}
                        </blockquote>
                      </div>

                      {/* Suggested Wording or Action */}
                      {selectedReq.suggestedWording && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-800 font-mono block mb-1">
                            Recommended Tender Specification Wording
                          </span>
                          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-2.5 text-xs font-mono text-teal-950 leading-relaxed">
                            {selectedReq.suggestedWording}
                          </div>
                        </div>
                      )}

                      {selectedReq.suggestedAction && !selectedReq.suggestedWording && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block mb-1">
                            Suggested Officer Action
                          </span>
                          <p className="text-xs text-ink-700 bg-ivory-50 p-2 rounded border border-ink-100">
                            {selectedReq.suggestedAction}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    (() => {
                      const stdComp = selectedReq.standardCompliance?.[activeTab];
                      if (!stdComp) return <div className="text-xs text-ink-500">Standard details unavailable.</div>;
                      
                      return (
                        <div className="space-y-4">
                          {/* Standard Info Header */}
                          <div className="flex items-start justify-between gap-2 p-2.5 bg-ivory-50/50 rounded-lg border border-ink-100">
                            <div>
                              <div className="font-semibold text-ink-900 text-xs">
                                {stdComp.standard_label}
                              </div>
                            </div>
                            {stdComp.status && (
                              <Badge variant={
                                stdComp.status.toLowerCase() === 'active' ? 'success' : 
                                stdComp.status.toLowerCase() === 'withdrawn' ? 'error' : 'warning'
                              }>
                                {stdComp.status.toUpperCase()}
                              </Badge>
                            )}
                          </div>

                          {/* Compliance Notes */}
                          {stdComp.status_note && (
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block mb-1">
                                Status Check
                              </span>
                              <div className={`text-xs p-2.5 rounded-lg border leading-relaxed ${
                                stdComp.is_usable === false 
                                  ? 'bg-error-50/50 border-error-200 text-error-800' 
                                  : 'bg-ivory-50/70 border-ink-100 text-ink-700'
                              }`}>
                                {stdComp.status_note}
                              </div>
                            </div>
                          )}

                          {stdComp.version_note && (
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block mb-1">
                                Edition / Version
                              </span>
                              <div className="text-xs text-ink-700 leading-relaxed bg-ivory-50/70 p-2.5 rounded-lg border border-ink-100">
                                {stdComp.version_note}
                              </div>
                            </div>
                          )}

                          {stdComp.scope_note && (
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block mb-1">
                                Scope Assessment
                              </span>
                              <div className="text-xs text-warning-800 leading-relaxed bg-warning-50/50 p-2.5 rounded-lg border border-warning-200">
                                {stdComp.scope_note}
                              </div>
                            </div>
                          )}

                          {/* Recommended Action (Standard specific) */}
                          {stdComp.action && (
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-800 font-mono block mb-1">
                                Suggested Officer Action
                              </span>
                              <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-2.5 text-xs font-mono text-teal-950 leading-relaxed">
                                {stdComp.action}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>




                {/* Human Review Decision Buttons */}
                <div className="pt-2 border-t border-ink-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block mb-1.5">
                    Officer Decision State
                  </span>
                  {_analysis.standard_decisions && _analysis.standard_decisions[selectedReq.standardId]?.decision === 'rejected' ? (
                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 font-medium">
                      This finding is waived because its parent standard was rejected.
                    </div>
                  ) : (
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <button
                      onClick={() => handleDecision(selectedReq.id, 'accepted')}
                      className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                        decisions[selectedReq.id] === 'accepted'
                          ? 'bg-success-600 text-white shadow-soft'
                          : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                      }`}
                    >
                      <Check size={11} className="inline mr-1" />
                      Accept Finding
                    </button>
                    <button
                      onClick={() => handleDecision(selectedReq.id, 'reviewed')}
                      className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                        decisions[selectedReq.id] === 'reviewed'
                          ? 'bg-warning-500 text-white shadow-soft'
                          : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                      }`}
                    >
                      <HelpCircle size={11} className="inline mr-1" />
                      Mark for Review
                    </button>
                    <button
                      onClick={() => handleDecision(selectedReq.id, 'rejected')}
                      className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                        decisions[selectedReq.id] === 'rejected'
                          ? 'bg-error-600 text-white shadow-soft'
                          : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                      }`}
                    >
                      <X size={11} className="inline mr-1" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleDecision(selectedReq.id, 'deleted')}
                      className="flex-none py-1 px-2 rounded text-[11px] font-medium transition-all bg-ivory-100 text-ink-500 hover:bg-error-50 hover:text-error-600"
                      title="Delete Finding"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-3 border-t border-ink-100 flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate({ name: 'analysis', analysisId, tab: 'evidence' })}
                  rightIcon={<ScrollText size={13} />}
                >
                  View in Evidence Workspace
                </Button>
                {selectedReq.standardId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ name: 'standard', standardId: selectedReq.standardId, analysisId: _analysis.id })}
                    leftIcon={<BookOpen size={13} />}
                  >
                    View Applicable Standard ({selectedReq.applicableStandard})
                  </Button>

                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. DECISION SUPPORT ADVISORY BANNER                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-lg border border-ink-200 bg-ivory-100 p-3 text-xs text-ink-600 flex items-start gap-2.5">
        <Info size={15} className="mt-0.5 shrink-0 text-ink-500" />
        <p className="leading-relaxed">
          ManakSetu provides decision support based on indexed standard clauses and tender text extractions.
          Final procurement judgment remains with the officer.
        </p>
      </div>
    </div>
  );
}

