import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Columns,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  Flag,
  HelpCircle,
  History,
  Info,
  Layers,
  Paperclip,
  Quote,
  Scale,
  ScrollText,
  Search,
  Share2,
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
  documents,
  getEvidenceChainsByAnalysisId,
  getStandardById,
} from '@/data/mockData';
import type {
  Analysis,
  EvidenceChainItem,
  EvidenceStatus,
  HumanDecision,
  HumanReviewConfidence,
} from '@/data/types';
import { formatDate } from '@/utils/format';

interface Props {
  analysis: Analysis;
}

export function AnalysisEvidenceTab({ analysis }: Props) {
  const { navigate } = useRouter();
  const rawEvidence = getEvidenceChainsByAnalysisId(analysis.id);
  const analysisDocs = documents.filter((d) => d.analysisId === analysis.id);

  const [selectedEvId, setSelectedEvId] = useState<string>(rawEvidence[0]?.id || 'ev-1');
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<EvidenceStatus | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local state for saved / flagged / decisions
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({
    'ev-1': true,
    'ev-2': true,
    'ev-6': true,
  });

  const [flaggedItems, setFlaggedItems] = useState<Record<string, boolean>>({
    'ev-4': true,
    'ev-5': true,
  });

  const [decisions, setDecisions] = useState<Record<string, HumanDecision>>({
    'ev-1': 'accepted',
    'ev-2': 'accepted',
    'ev-3': 'accepted',
    'ev-4': 'reviewed',
    'ev-5': 'reviewed',
    'ev-6': 'accepted',
  });

  const handleDecision = (id: string, dec: HumanDecision) => {
    setDecisions((prev) => ({ ...prev, [id]: dec }));
  };

  const toggleSave = (id: string) => {
    setSavedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFlag = (id: string) => {
    setFlaggedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCitation = (item: EvidenceChainItem) => {
    const citation = `[Evidence Citation] ${item.requirement} -> ${item.standard} (${item.clause}) | Source: ${item.sourceDoc}, ${item.sourceLocation} | Quote: "${item.evidence}"`;
    navigator.clipboard.writeText(citation);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered evidence items
  const filteredEvidence = useMemo(() => {
    return rawEvidence.filter((item) => {
      if (search) {
        const q = search.toLowerCase();
        const matchReq = item.requirement.toLowerCase().includes(q);
        const matchStd = item.standard.toLowerCase().includes(q);
        const matchEv = item.evidence.toLowerCase().includes(q);
        const matchLoc = item.sourceLocation.toLowerCase().includes(q);
        if (!matchReq && !matchStd && !matchEv && !matchLoc) return false;
      }
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [rawEvidence, search, filterStatus]);

  // Selected item in inspector
  const selectedItem = useMemo(() => {
    return rawEvidence.find((e) => e.id === selectedEvId) || rawEvidence[0];
  }, [rawEvidence, selectedEvId]);

  const renderStatusBadge = (status?: EvidenceStatus) => {
    switch (status) {
      case 'supported':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <CheckCircle2 size={11} className="text-teal-600" />
            Evidence Available
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-warning-50 text-warning-800 border border-warning-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <HelpCircle size={11} className="text-warning-600" />
            Partial Support
          </span>
        );
      case 'needs-review':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <AlertTriangle size={11} className="text-amber-600" />
            Needs Review
          </span>
        );
      case 'not-found':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-error-50 text-error-800 border border-error-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <X size={11} className="text-error-600" />
            Not Found
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-ivory-100 text-ink-700 border border-ink-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            Verified
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* 1. HEADER & SOURCE DOCUMENT PROVENANCE STRIP                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-ink-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-ink-900 tracking-tight">
              Evidence & Provenance Workspace
            </h2>
            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200 font-mono">
              {rawEvidence.length} Verified Clause Mapping{rawEvidence.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Audit trail linking tender clauses to applicable standards, test protocols and verifiable conclusions.
          </p>

        </div>

        {/* Source Document Provenance summary */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-ink-200 shadow-soft text-xs font-mono">
          <FileText size={14} className="text-teal-700 shrink-0" />
          <span className="text-ink-900 font-semibold truncate max-w-[220px]">
            {analysisDocs[0]?.name || (analysis.documentCount > 0 ? 'Uploaded document' : 'Text specification')}
          </span>
          {analysisDocs[0]?.pages ? (
            <>
              <span className="text-ink-400">·</span>
              <span className="text-ink-500">{analysisDocs[0].pages} pgs</span>
            </>
          ) : null}
          <span className="rounded bg-success-50 text-success-800 px-1.5 py-0.5 text-[10px] font-bold border border-success-200">
            PARSED
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. SPLIT WORKSPACE INTERFACE                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN: TENDER / DOCUMENT EVIDENCE PASSAGES (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-ink-200 shadow-soft">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[10px] font-semibold uppercase text-ink-400 font-mono mr-1">
                Filter:
              </span>
              {[
                { id: 'all', label: 'All Evidence' },
                { id: 'supported', label: 'Supported' },
                { id: 'needs-review', label: 'Needs Review' },
                { id: 'partial', label: 'Partial' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as any)}
                  className={`rounded px-2.5 py-0.5 text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    filterStatus === tab.id
                      ? 'bg-ink-900 text-white'
                      : 'bg-ivory-100 text-ink-600 hover:bg-ivory-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search excerpts…"
                className="rounded border border-ink-200 bg-ivory-50 py-1 pl-7 pr-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-teal-500 focus:bg-white focus:outline-none w-36 sm:w-44"
              />
            </div>
          </div>

          {/* List of Evidence Cards */}
          <div className="space-y-2.5">
            {filteredEvidence.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isSaved = savedItems[item.id];
              const isFlagged = flaggedItems[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedEvId(item.id)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/20 shadow-sm ring-1 ring-teal-500'
                      : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ivory-50/50 shadow-soft'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-900">
                          {item.standard}
                        </span>
                        {renderStatusBadge(item.status)}
                      </div>
                      <h4 className="mt-1 text-xs font-semibold text-ink-900 font-sans">
                        {item.requirement}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(item.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isSaved
                            ? 'text-teal-700 bg-teal-50'
                            : 'text-ink-400 hover:text-ink-700 hover:bg-ivory-100'
                        }`}
                        title={isSaved ? 'Saved in evidence' : 'Save evidence'}
                      >
                        <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFlag(item.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isFlagged
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-ink-400 hover:text-ink-700 hover:bg-ivory-100'
                        }`}
                        title={isFlagged ? 'Flagged for review' : 'Flag for review'}
                      >
                        <Flag size={13} fill={isFlagged ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  {/* Highlighted Tender Text Excerpt */}
                  <div className="mt-2.5 rounded-lg border-l-2 border-teal-500 bg-ivory-50 px-3 py-2 text-xs italic text-ink-800 leading-relaxed font-sans">
                    {item.evidence}
                  </div>

                  {/* Provenance Location & Clause */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-500 font-mono">
                    <span className="flex items-center gap-1 text-teal-800 font-medium">
                      <FileSearch size={12} />
                      {item.sourceLocation}
                    </span>
                    <span className="text-ink-400">
                      Clause: {item.clause}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: EVIDENCE INSPECTOR & 5-STEP PROVENANCE CHAIN (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          {selectedItem ? (
          <Card padding="md" className="bg-white border-ink-200 shadow-soft h-full flex flex-col justify-between">
            <div className="space-y-4">
              {/* Inspector Header */}
              <div className="border-b border-ink-100 pb-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-800 font-mono bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Provenance Inspector
                  </span>
                  <div className="flex items-center gap-1.5">
                    {renderStatusBadge(selectedItem.status)}
                    <span className="rounded bg-ivory-100 text-ink-600 px-2 py-0.5 text-[10px] font-mono">
                      {selectedItem.reviewConfidence === 'high-confidence' ? 'High confidence' : 'Needs review'}
                    </span>
                  </div>
                </div>

                <h3 className="font-mono text-base font-bold text-ink-900">
                  {selectedItem.requirement}
                </h3>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* 5-STEP PROVENANCE DECISION CHAIN                           */}
              {/* ---------------------------------------------------------- */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block">
                  Verifiable Decision Provenance Chain
                </span>

                {/* Step 1: Detected Requirement */}
                <div className="rounded-lg border border-ink-100 bg-ivory-50/50 p-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white text-[10px]">
                      1
                    </span>
                    <span>Detected Procurement Requirement</span>
                  </div>
                  <p className="pl-7 text-xs text-ink-700 mt-1 font-sans">
                    {selectedItem.requirement}
                  </p>
                </div>

                {/* Stepper Arrow */}
                <div className="flex justify-center -my-1 text-ink-300">
                  <ArrowDown size={14} />
                </div>

                {/* Step 2: Applicable Standard / Regulation */}
                <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-950">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-800 text-white text-[10px]">
                      2
                    </span>
                    <span>Primary Applicable Standard</span>
                  </div>
                  <p className="pl-7 text-xs font-mono font-bold text-teal-900 mt-0.5">

                    {selectedItem.standard}
                  </p>
                </div>

                {/* Stepper Arrow */}
                <div className="flex justify-center -my-1 text-ink-300">
                  <ArrowDown size={14} />
                </div>

                {/* Step 3: Relevant Clause */}
                <div className="rounded-lg border border-ink-100 bg-ivory-50/50 p-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white text-[10px]">
                      3
                    </span>
                    <span>Relevant Clause & Testing Criteria</span>
                  </div>
                  <p className="pl-7 text-xs font-mono text-ink-700 mt-0.5">
                    {selectedItem.clause}
                  </p>
                </div>

                {/* Stepper Arrow */}
                <div className="flex justify-center -my-1 text-ink-300">
                  <ArrowDown size={14} />
                </div>

                {/* Step 4: Source Tender Evidence */}
                <div className="rounded-lg border border-ink-100 bg-white p-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-mono font-semibold text-ink-900">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-700 text-white text-[10px]">
                        4
                      </span>
                      <span>Source Tender Evidence</span>
                    </div>
                    <span className="text-[10px] text-teal-800 font-medium">
                      {selectedItem.sourceLocation}
                    </span>
                  </div>
                  <blockquote className="mt-1.5 border-l-2 border-teal-500 pl-2.5 text-xs italic text-ink-800 font-sans leading-relaxed">
                    {selectedItem.evidence}
                  </blockquote>
                </div>

                {/* Stepper Arrow */}
                <div className="flex justify-center -my-1 text-ink-300">
                  <ArrowDown size={14} />
                </div>

                {/* Step 5: Verifiable Conclusion */}
                <div className="rounded-lg border border-success-200 bg-success-50/40 p-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-success-950">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-700 text-white text-[10px]">
                      5
                    </span>
                    <span>Auditable Intelligence Conclusion</span>
                  </div>
                  <p className="pl-7 text-xs text-ink-800 mt-1 font-sans leading-relaxed">
                    {selectedItem.conclusion}
                  </p>
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* HUMAN OFFICER ACTIONS & DECISIONS                         */}
              {/* ---------------------------------------------------------- */}
              <div className="pt-3 border-t border-ink-100 space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono block">
                  Officer Review & Verification
                </span>

                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <button
                    onClick={() => handleDecision(selectedItem.id, 'accepted')}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                      decisions[selectedItem.id] === 'accepted'
                        ? 'bg-success-600 text-white shadow-soft'
                        : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                    }`}
                  >
                    <Check size={11} className="inline mr-1" />
                    Accept Finding
                  </button>
                  <button
                    onClick={() => handleDecision(selectedItem.id, 'reviewed')}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                      decisions[selectedItem.id] === 'reviewed'
                        ? 'bg-warning-500 text-white shadow-soft'
                        : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                    }`}
                  >
                    <HelpCircle size={11} className="inline mr-1" />
                    Mark for Review
                  </button>
                  <button
                    onClick={() => handleDecision(selectedItem.id, 'rejected')}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                      decisions[selectedItem.id] === 'rejected'
                        ? 'bg-error-600 text-white shadow-soft'
                        : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                    }`}
                  >
                    <X size={11} className="inline mr-1" />
                    Reject
                  </button>
                </div>

                {/* Evidence Utility Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCopyCitation(selectedItem)}
                    leftIcon={copiedId === selectedItem.id ? <Check size={13} className="text-teal-600" /> : <Copy size={13} />}
                  >
                    {copiedId === selectedItem.id ? 'Citation Copied!' : 'Copy Citation'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFlag(selectedItem.id)}
                    leftIcon={<Flag size={13} className={flaggedItems[selectedItem.id] ? 'text-amber-600' : ''} />}
                  >
                    {flaggedItems[selectedItem.id] ? 'Flagged' : 'Flag'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Navigation Links */}
            <div className="pt-3 border-t border-ink-100 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate({ name: 'analysis', analysisId: analysis.id, tab: 'gaps' })}
                  leftIcon={<ShieldAlert size={13} />}
                >
                  Specification Quality Tab
                </Button>
                {selectedItem.standardId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate({ name: 'standard', standardId: selectedItem.standardId!, analysisId: analysis.id })}
                    rightIcon={<ExternalLink size={13} />}
                  >
                    View Standard
                  </Button>
                )}
              </div>
            </div>
          </Card>
          ) : (
            <Card padding="lg" className="flex h-full items-center justify-center border-ink-200 bg-white text-center shadow-soft">
              <div>
                <FileText size={22} className="mx-auto mb-2 text-ink-300" />
                <p className="text-sm font-medium text-ink-700">No evidence to inspect</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-ink-400">
                  This analysis produced no source-backed clause mappings, or none is selected.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. DECISION SUPPORT ADVISORY BANNER                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-lg border border-ink-200 bg-ivory-100 p-3 text-xs text-ink-600 flex items-start gap-2.5">
        <Info size={15} className="mt-0.5 shrink-0 text-ink-500" />
        <p className="leading-relaxed">
          ManakSetu provides decision support based on indexed tender extractions and BIS standard cross-referencing.
          Final procurement judgment remains with the officer.
        </p>
      </div>
    </div>
  );
}

