import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  GitBranch,
  HelpCircle,
  Layers,
  Lightbulb,
  Scale,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRouter, type AnalysisTab } from '@/router';
import {
  getStandardById,
  getGapsByAnalysisId,
  getRelationshipsByAnalysisId,
  getMatchedRequirementsByAnalysisId,
  getEvidenceChainsByAnalysisId,
  statusConfig,
} from '@/data/mockData';
import type {
  Analysis,
  HumanDecision,
  HumanReviewConfidence,
  MatchedRequirementItem,
  MatchedRequirementStatus,
  Standard,
} from '@/data/types';
import { formatDate } from '@/utils/format';
import { isRetiredStandard, retrievalMatchLabel, RETRIEVAL_MATCH_TOOLTIP } from '@/services/adapter';

interface Props {
  analysis: Analysis;
  isReal?: boolean;
}

export function AnalysisOverviewTab({ analysis, isReal = false }: Props) {
  const { navigate } = useRouter();
  const isLedDemo = analysis.id === 'an-001' || (isReal && (analysis.title?.includes('Arterial Roads') ?? false));

  // All matched standards for metrics
  const matchedStandards = analysis.matchedStandardIds
    .map((id) => getStandardById(id))
    .filter((s): s is Standard => s !== undefined)
    .filter((s) => !(analysis.standard_decisions && analysis.standard_decisions[s.id]?.decision === 'rejected'));

  // A withdrawn or superseded standard is never presented as the primary one.
  const primaryCandidate = matchedStandards[0] || getStandardById(analysis.matchedStandardIds[0]);
  const primaryStandard = primaryCandidate && isRetiredStandard(primaryCandidate)
    ? matchedStandards.find((s) => !isRetiredStandard(s))
    : primaryCandidate;

  const gaps = getGapsByAnalysisId(analysis.id);
  const relatedCount = getRelationshipsByAnalysisId(analysis.id).length;
  const initialRequirements = getMatchedRequirementsByAnalysisId(analysis.id);
  const evidenceChains = getEvidenceChainsByAnalysisId(analysis.id);

  const metricItems = [
    {
      label: 'Applicable Standards',
      value: analysis.standardsIdentified,
      detail: 'Primary & normative codes',
      tab: 'standards' as AnalysisTab,
      accent: 'border-teal-500/30 bg-white',
      badge: 'IS codes',
    },
    {
      label: 'Related References',
      value: relatedCount,
      detail: 'Normative references cited',
      tab: 'relationships' as AnalysisTab,
      accent: 'border-ink-200 bg-white',
      badge: 'Companions',
    },
    {
      label: 'Specification Issues',
      value: analysis.gapsFound,
      detail: 'Gaps & restrictive clauses',
      tab: 'gaps' as AnalysisTab,
      accent: 'border-warning-200 bg-warning-50/20',
      badge: 'Review',
    },
    {
      label: 'Regulatory Checks',
      value: analysis.certificationsRequired,
      detail: 'Mandatory certifications',
      tab: 'certification' as AnalysisTab,
      accent: 'border-blue-200 bg-blue-50/20',
      badge: 'Statutory',
    },
  ];

  // Interactive human decision states
  const [requirements, setRequirements] = useState<MatchedRequirementItem[]>(initialRequirements);
  const [primaryDecision, setPrimaryDecision] = useState<HumanDecision>('accepted');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(evidenceChains[0]?.id || null);
  const [statusFilter, setStatusFilter] = useState<'all' | MatchedRequirementStatus | 'accepted' | 'rejected'>('all');

  const handleDecision = (reqId: string, decision: HumanDecision) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, decision } : r))
    );
  };

  const filteredRequirements = requirements.filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'accepted') return r.decision === 'accepted';
    if (statusFilter === 'rejected') return r.decision === 'rejected';
    
    // For standard system filters (covered, partial, needs-review), hide rejected items.
    if (r.decision === 'rejected') return false;
    
    return r.status === statusFilter;
  });

  const selectedEvidence = evidenceChains.find((e) => e.id === selectedEvidenceId) || evidenceChains[0];

  // Helper for matched requirement status badge
  const renderReqStatusBadge = (status: MatchedRequirementStatus) => {
    switch (status) {
      case 'covered':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-800 border border-success-200/60">
            <CheckCircle2 size={11} className="text-success-600" />
            Covered
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-800 border border-warning-200/60">
            <AlertTriangle size={11} className="text-warning-600" />
            Partial
          </span>
        );
      case 'needs-review':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800 border border-blue-200/60">
            <HelpCircle size={11} className="text-blue-600" />
            Needs review
          </span>
        );
      case 'not-found':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700 border border-ink-200">
            <X size={11} className="text-ink-500" />
            Not found
          </span>
        );
    }
  };

  // Helper for confidence status badge
  const renderConfidenceBadge = (confidence?: HumanReviewConfidence) => {
    switch (confidence) {
      case 'high-confidence':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
            <CheckCircle2 size={12} className="text-teal-600" />
            High confidence
          </span>
        );
      case 'needs-review':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-800 border border-warning-200">
            <AlertTriangle size={12} className="text-warning-600" />
            Needs review
          </span>
        );
      case 'insufficient-evidence':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-error-50 px-2 py-0.5 text-xs font-semibold text-error-800 border border-error-200">
            <ShieldAlert size={12} className="text-error-600" />
            Insufficient evidence
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-ink-900">
      {/* ------------------------------------------------------------------ */}
      {/* 1. TOP INTELLIGENCE METRIC STRIP (Compact Summary)                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate({ name: 'analysis', analysisId: analysis.id, tab: item.tab })}
            className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all hover:border-ink-300 hover:shadow-soft active:scale-[0.99] ${item.accent}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                {item.label}
              </span>
              <span className="text-[10px] font-medium text-ink-400 font-mono">
                {item.badge}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-ink-900 tabular-nums">
                {item.value}
              </span>
              <span className="text-xs text-ink-500 truncate">{item.detail}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. PRIMARY APPLICABLE STANDARD (The Visual Centerpiece)            */}
      {/* ------------------------------------------------------------------ */}
      {primaryStandard && (
        <Card padding="lg" className="border-teal-200 bg-white shadow-card overflow-hidden">
          <div className="flex flex-col gap-5">
            {/* Top Bar of Primary Standard */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-teal-400 font-mono text-sm font-bold shadow-soft">
                  IS
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Primary Applicable Standard
                    </span>

                    <Badge variant={statusConfig[primaryStandard.status].variant}>
                      {statusConfig[primaryStandard.status].label}
                    </Badge>
                    {renderConfidenceBadge(primaryStandard.reviewConfidence)}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink-900 sm:text-xl">
                    {primaryStandard.number} — {primaryStandard.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-500 font-mono">
                    Edition {primaryStandard.edition} · Bureau: {primaryStandard.bureau} ({primaryStandard.section})
                    {primaryStandard.pages ? ` · ${primaryStandard.pages} pages` : ''}
                    {isLedDemo && ' · Incorporates Amendment 1 & 2'}
                  </p>
                </div>
              </div>

              {/* Retrieval Match & Human Decision Pill */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-2 rounded-lg bg-ivory-100/80 px-3 py-1.5 border border-ink-200/80" title={RETRIEVAL_MATCH_TOOLTIP}>
                  <div className="text-right">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                      Retrieval Match
                    </span>
                    <span className="text-base font-bold text-ink-900">
                      {retrievalMatchLabel(primaryStandard.applicabilityScore) ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Officer Review Actions */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-ink-400 font-medium">Officer Judgement:</span>
                  <button
                    onClick={() => setPrimaryDecision('accepted')}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-all ${
                      primaryDecision === 'accepted'
                        ? 'bg-success-600 text-white shadow-soft'
                        : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                    }`}
                  >
                    <Check size={12} />
                    Accept
                  </button>
                  <button
                    onClick={() => setPrimaryDecision('reviewed')}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-all ${
                      primaryDecision === 'reviewed'
                        ? 'bg-warning-500 text-white shadow-soft'
                        : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                    }`}
                  >
                    <HelpCircle size={12} />
                    Review
                  </button>
                  <button
                    onClick={() => setPrimaryDecision('rejected')}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-all ${
                      primaryDecision === 'rejected'
                        ? 'bg-error-600 text-white shadow-soft'
                        : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                    }`}
                  >
                    <X size={12} />
                    Reject
                  </button>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* 3. WHY THIS STANDARD APPLIES (Structured Reasoning Panel)           */}
            {/* ------------------------------------------------------------------ */}
            <div className="rounded-xl border border-ink-200/80 bg-ivory-50/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale size={15} className="text-teal-700" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-900">
                    Why this standard applies
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-ink-400">
                  Defensible Match Reasoning
                </span>
              </div>

              {!isLedDemo ? (
                <p className="text-xs leading-relaxed text-ink-700">
                  {primaryStandard.whyApplies || primaryStandard.summary}
                </p>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    category: 'Scope match',
                    text: 'Product scope matches outdoor public lighting equipment requirements',
                  },
                  {
                    category: 'Product match',
                    text: 'LED street lighting luminaire (enclosure, optics & controlgear)',
                  },
                  {
                    category: 'Application match',
                    text: 'Road / outdoor highway lighting application per tender NIT §1.0',
                  },
                  {
                    category: 'Power range compatibility',
                    text: '90W to 120W operating voltage & electrical thresholds fully supported',
                  },
                  {
                    category: 'Environmental rating',
                    text: 'IP66 weatherproof enclosure & mechanical endurance criteria satisfied',
                  },
                  {
                    category: 'Edition validity',
                    text: 'Current valid edition (supersedes withdrawn IS 1944:1981 code)',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-ink-100 bg-white p-2.5 text-xs shadow-soft"
                  >
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal-600" />
                    <div>
                      <span className="font-semibold text-ink-900 block text-[11px]">
                        {item.category}
                      </span>
                      <span className="text-ink-600 text-[11px] leading-relaxed">
                        {item.text}
                      </span>
                    </div>
                  </div>
                ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-ink-200/60 pt-2 text-xs text-ink-500">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck size={13} className="text-teal-600" />
                  Source-backed evidence available for all matched clauses
                </span>
                <button
                  onClick={() => navigate({ name: 'standard', standardId: primaryStandard.id, analysisId: analysis.id })}
                  className="font-medium text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 text-[11px]"
                >
                  View full standard specification <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. MATCHED REQUIREMENTS TABLE                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card padding="lg" className="bg-white border-ink-200 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 size={16} className="text-teal-700" />
              <h3 className="text-sm font-semibold text-ink-900">
                Matched Procurement Requirements
              </h3>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Tender technical requirements mapped to applicable standard clauses with coverage status
            </p>
          </div>

          {/* Filter Status Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: `All (${requirements.length})` },
              { id: 'covered', label: 'Covered' },
              { id: 'partial', label: 'Partial' },
              { id: 'needs-review', label: 'Needs review' },
              { id: 'accepted', label: 'Accepted' },
              { id: 'rejected', label: 'Rejected' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-ink-900 text-white'
                    : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requirements Table / Card Rows */}
        <div className="space-y-2.5">
          {filteredRequirements.map((req) => (
            <div
              key={req.id}
              className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-lg border p-3 text-xs transition-colors ${req.decision === 'rejected' ? 'border-error-200 bg-error-50/20 opacity-75' : 'border-ink-100 bg-ivory-50/40 hover:border-ink-200 hover:bg-ivory-50'}`}
            >
              {/* Left: Requirement & Parameter Value */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-xs ${req.decision === 'rejected' ? 'line-through text-ink-500' : 'text-ink-900'}`}>{req.requirement}</span>
                  {renderReqStatusBadge(req.status)}
                  {renderConfidenceBadge(req.reviewConfidence)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-600">
                  <span>
                    Specification: <strong className="font-mono text-ink-800">{req.parameterValue}</strong>
                  </span>
                  <span className="text-ink-300">·</span>
                  <span className="font-mono text-[11px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                    {req.standardCode}
                  </span>
                  <span className="text-ink-300">·</span>
                  <span className="text-ink-500 font-mono text-[11px]">{req.clause}</span>
                </div>
                {req.evidenceSnippet && (
                  <p className="mt-1.5 text-[11px] italic text-ink-500 bg-white/70 p-1.5 rounded border border-ink-100 font-mono line-clamp-2">
                    {req.evidenceSnippet} — <span className="font-sans not-italic text-ink-400">{req.evidenceSource}</span>
                  </p>
                )}
              </div>

              {/* Right: Human Review Actions */}
              <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-ink-100">
                <button
                  onClick={() => handleDecision(req.id, 'accepted')}
                  title="Accept requirement match"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    req.decision === 'accepted'
                      ? 'bg-success-600 text-white shadow-soft'
                      : 'bg-white border border-ink-200 text-ink-600 hover:bg-ivory-100'
                  }`}
                >
                  <Check size={12} />
                  Accept
                </button>
                <button
                  onClick={() => handleDecision(req.id, 'reviewed')}
                  title="Mark for technical committee review"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    req.decision === 'reviewed'
                      ? 'bg-warning-500 text-white shadow-soft'
                      : 'bg-white border border-ink-200 text-ink-600 hover:bg-ivory-100'
                  }`}
                >
                  <HelpCircle size={12} />
                  Review
                </button>
                <button
                  onClick={() => handleDecision(req.id, 'rejected')}
                  title="Reject match"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    req.decision === 'rejected'
                      ? 'bg-error-600 text-white shadow-soft'
                      : 'bg-white border border-ink-200 text-ink-600 hover:bg-ivory-100'
                  }`}
                >
                  <X size={12} />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 5. EVIDENCE PREVIEW & FULL REASONING CHAIN                         */}
      {/* ------------------------------------------------------------------ */}
      <Card padding="lg" className="bg-white border-ink-200 shadow-soft">
        <div className="mb-4 flex items-center justify-between border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <ScrollText size={16} className="text-teal-700" />
            <h3 className="text-sm font-semibold text-ink-900">
              Source Evidence & Complete Provenance Chain
            </h3>
          </div>
          <span className="text-xs text-ink-400 font-mono">
            Evidence Available
          </span>
        </div>

        {/* Evidence Chain Visual Ribbon: Requirement → Standard → Clause → Evidence → Conclusion */}
        {isLedDemo && (
        <div className="mb-5 rounded-lg border border-teal-200/80 bg-teal-50/30 p-3 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-800 mb-2">
            Auditable Procurement Intelligence Chain
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center font-mono text-[11px]">
            <div className="rounded bg-white p-2 border border-ink-200 shadow-soft">
              <span className="block text-[10px] text-ink-400 uppercase font-sans">Requirement</span>
              <span className="font-semibold text-ink-900 truncate block mt-0.5">IP66 Weatherproof</span>
            </div>
            <div className="rounded bg-white p-2 border border-teal-200 shadow-soft">
              <span className="block text-[10px] text-teal-600 uppercase font-sans">Standard</span>
              <span className="font-semibold text-teal-900 truncate block mt-0.5">IS 10322 (Pt 5/Sec 3)</span>
            </div>
            <div className="rounded bg-white p-2 border border-ink-200 shadow-soft">
              <span className="block text-[10px] text-ink-400 uppercase font-sans">Clause</span>
              <span className="font-semibold text-ink-900 truncate block mt-0.5">Clause 7.2 & IS/IEC 60529</span>
            </div>
            <div className="rounded bg-white p-2 border border-ink-200 shadow-soft">
              <span className="block text-[10px] text-ink-400 uppercase font-sans">Source Evidence</span>
              <span className="font-semibold text-ink-900 truncate block mt-0.5">NIT §3.1.2 / Page 12</span>
            </div>
            <div className="rounded bg-success-50 p-2 border border-success-200 shadow-soft">
              <span className="block text-[10px] text-success-700 uppercase font-sans">Conclusion</span>
              <span className="font-semibold text-success-900 truncate block mt-0.5">NABL Test Mandated</span>
            </div>
          </div>
        </div>
        )}

        {/* Evidence Card Selector & Excerpt */}
        <div className="grid gap-4 sm:grid-cols-3">
          {evidenceChains.map((ev) => (
            <button
              key={ev.id}
              onClick={() => setSelectedEvidenceId(ev.id)}
              className={`rounded-lg border p-3 text-left transition-all ${
                selectedEvidenceId === ev.id
                  ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500/20'
                  : 'border-ink-200 bg-white hover:border-ink-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] font-semibold text-teal-800">
                  {ev.standard}
                </span>
                <span className="text-[10px] text-ink-400 font-mono">{ev.sourceLocation}</span>
              </div>
              <p className="text-xs font-semibold text-ink-900 mb-1">{ev.requirement}</p>
              <p className="text-[11px] text-ink-600 line-clamp-2 italic font-mono bg-white/70 p-1 rounded border border-ink-100">
                {ev.evidence}
              </p>
            </button>
          ))}
        </div>

        {/* Selected Evidence Deep View */}
        {selectedEvidence && (
          <div className="mt-4 rounded-lg border border-ink-200 bg-ivory-50/60 p-4 text-xs">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-900">Source Evidence Provenance</span>
                <Badge variant="teal" className="text-[10px]">Source-Backed Evidence</Badge>
              </div>
              <span className="font-mono text-[11px] text-ink-400">
                File: {selectedEvidence.sourceDoc} · {selectedEvidence.sourceLocation}
              </span>
            </div>

            <blockquote className="border-l-2 border-teal-500 pl-3 text-xs italic text-ink-800 bg-white p-2.5 rounded-r font-mono">
              {selectedEvidence.evidence}
            </blockquote>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded bg-white p-2.5 border border-ink-100">
                <p className="font-semibold text-ink-800 text-[11px] uppercase tracking-wider">Governing Clause</p>
                <p className="font-mono text-xs font-semibold text-teal-800 mt-0.5">{selectedEvidence.standard}</p>
                <p className="text-[11px] text-ink-600">{selectedEvidence.clause}</p>
              </div>

              <div className="rounded bg-white p-2.5 border border-ink-100">
                <p className="font-semibold text-ink-800 text-[11px] uppercase tracking-wider">Evaluation Conclusion</p>
                <p className="text-xs text-ink-700 mt-0.5 leading-relaxed">{selectedEvidence.conclusion}</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
