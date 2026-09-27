import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileSearch,
  FileText,
  HelpCircle,
  History,
  Info,
  Layers,
  Scale,
  ScrollText,
  Search,
  Shield,
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
  getRegulatoryRequirementsByAnalysisId,
  getStandardById,
} from '@/data/mockData';
import type {
  Analysis,
  HumanDecision,
  HumanReviewConfidence,
  RegulatoryRequirement,
  RegulatoryRequirementStatus,
  RegulatoryRequirementType,
} from '@/data/types';

interface Props {
  analysis: Analysis;
}

function qcoFindingToRegulatoryRequirement(
  qco: any,
  analysisId: string
): RegulatoryRequirement {
  return {
    id: `reg-qco-${qco.is_number.replace(/\W+/g, '-')}`,
    analysisId,
    requirement: qco.notification_title 
      ? `${qco.notification_title} — ${qco.is_number}`
      : `BIS Compulsory Registration Scheme (CRS) — ${qco.is_number}`,
    type: 'regulatory-order',
    status: 'applicable',
    reviewConfidence: qco.confidence >= 0.95 ? 'high-confidence' : 'needs-review',
    relatedStandard: qco.is_number,
    issuingAuthority: qco.issuing_ministry || 'Bureau of Indian Standards (BIS)',
    sourceDocument: 'Quality Control Order',
    orderNumber: qco.gazette_so_number,
    effectiveDate: qco.effective_date,
    validityInfo: 'CRS certificate must be valid at date of supply (not just bid submission).',
    whyAppliesText: qco.mandate_text || 'This product is notified under a Quality Control Order requiring mandatory certification.',
    whyAppliesCriteria: [
      {
        text: `Tender explicitly relates to QCO notified products: ${(qco.products_covered || []).join(', ') || qco.is_number}`,
        matched: true
      }
    ],
    evidenceAvailable: true,
    evidenceSnippet: `"${qco.mandate_text || 'Mandatory certification required'}" — QCO Gazette`,
    evidenceSource: 'Quality Control Order Database'
  };
}

function testingRequirementToRegulatoryRequirement(
  req: any,
  analysisId: string,
  idx: number
): RegulatoryRequirement {
  return {
    id: `reg-test-${idx}`,
    analysisId,
    requirement: `Testing & Accreditation — ${req.label || 'Parameters'}`,
    type: 'testing-accreditation',
    status: 'conditional',
    reviewConfidence: 'high-confidence',
    relatedStandard: 'NABL / ISO/IEC 17025',
    issuingAuthority: 'National Accreditation Board for Testing and Calibration Laboratories (NABL)',
    sourceDocument: 'Tender technical specification — bidder submission requirements',
    validityInfo: 'Test reports must not be older than 24-36 months from the bid submission deadline.',
    whyAppliesText: req.value || 'The tender explicitly requires NABL-accredited testing for this parameter.',
    whyAppliesCriteria: [
      {
        text: `Tender requires accredited test reports for: ${req.label || 'this parameter'}`,
        matched: true
      }
    ],
    evidenceAvailable: true,
    evidenceSnippet: `"${req.sourceClause || req.value}" — Tender description`,
  };
}

import { isSeededAnalysisId } from '@/data/runtimeStore';

export function AnalysisCertificationTab({ analysis }: Props) {
  const { navigate } = useRouter();
  
  // Use mock data for demo, or generate from real standards if available
  let rawRequirements = isSeededAnalysisId(analysis.id) ? getRegulatoryRequirementsByAnalysisId(analysis.id) : [];
  
  if (analysis.qco_findings && analysis.qco_findings.length > 0) {
    rawRequirements = analysis.qco_findings.map(q => qcoFindingToRegulatoryRequirement(q, analysis.id));
  }
  
  if (analysis.product_profile?.testingRequirements?.length > 0) {
    rawRequirements = [
      ...rawRequirements,
      ...analysis.product_profile.testingRequirements.map((t: any, idx: number) => testingRequirementToRegulatoryRequirement(t, analysis.id, idx))
    ];
  }
  




  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<RegulatoryRequirementType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<RegulatoryRequirementStatus | 'all'>('all');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(rawRequirements[0]?.id || null);

  // Local human review decisions - persisted to localStorage
  const [decisions, setDecisions] = useState<Record<string, HumanDecision>>(() => {
    const saved = localStorage.getItem(`decisions-cert-${analysis.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      'reg-001': 'accepted',
      'reg-002': 'accepted',
      'reg-003': 'accepted',
      'reg-004': 'reviewed',
      'reg-005': 'accepted',
      'reg-006': 'accepted',
    };
  });

  useEffect(() => {
    localStorage.setItem(`decisions-cert-${analysis.id}`, JSON.stringify(decisions));
  }, [decisions, analysis.id]);

  const handleDecision = (id: string, dec: HumanDecision) => {
    setDecisions((prev) => ({ ...prev, [id]: dec }));
  };

  // Summary counts
  const summaryCounts = useMemo(() => {
    return {
      applicable: rawRequirements.filter((r) => r.status === 'applicable').length,
      conditional: rawRequirements.filter((r) => r.status === 'conditional').length,
      recommended: rawRequirements.filter((r) => r.status === 'recommended').length,
      needsReview: rawRequirements.filter((r) => r.status === 'needs-review').length,
    };
  }, [rawRequirements]);

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return rawRequirements.filter((item) => {
      if (search) {
        const q = search.toLowerCase();
        const matchReq = item.requirement.toLowerCase().includes(q);
        const matchAuth = item.issuingAuthority.toLowerCase().includes(q);
        const matchStd = item.relatedStandard.toLowerCase().includes(q);
        const matchDoc = item.sourceDocument.toLowerCase().includes(q);
        if (!matchReq && !matchAuth && !matchStd && !matchDoc) return false;
      }
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [rawRequirements, search, selectedType, selectedStatus]);

  const renderStatusBadge = (status: RegulatoryRequirementStatus) => {
    switch (status) {
      case 'applicable':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <CheckCircle2 size={11} className="text-teal-600" />
            Applicable
          </span>
        );
      case 'conditional':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <HelpCircle size={11} className="text-blue-600" />
            Conditional
          </span>
        );
      case 'recommended':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <Sparkles size={11} className="text-purple-600" />
            Recommended
          </span>
        );
      case 'needs-review':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <AlertTriangle size={11} className="text-amber-600" />
            Needs Review
          </span>
        );
      case 'insufficient-evidence':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-ivory-200 text-ink-700 border border-ink-300 px-2 py-0.5 text-[11px] font-mono font-medium">
            <HelpCircle size={11} className="text-ink-500" />
            Insufficient Evidence
          </span>
        );
      case 'not-established':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-error-50 text-error-800 border border-error-200 px-2 py-0.5 text-[11px] font-mono font-medium">
            <X size={11} className="text-error-600" />
            Not Established
          </span>
        );
    }
  };

  const renderTypeLabel = (type: RegulatoryRequirementType) => {
    switch (type) {
      case 'certification':
        return 'Product Certification';
      case 'regulatory-order':
        return 'Technical Regulation';
      case 'testing-accreditation':
        return 'Testing & Accreditation';
      case 'authority-requirement':
        return 'Authority Requirement';
      case 'procurement-condition':
        return 'Procurement Policy';
    }
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* 1. HEADER & INTRO                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b border-ink-100 pb-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink-900 tracking-tight">
                Regulatory & Certification Intelligence
              </h2>
              <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200 font-mono">
                Standards, regulations & certification
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Identify certification and regulatory requirements relevant to this procurement, with source context and review states.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ScrollText size={13} />}
              onClick={() => navigate({ name: 'analysis', analysisId: analysis.id, tab: 'evidence' })}
            >
              Evidence Workspace
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 2. COMPACT SUMMARY STRIP                                          */}
        {/* ------------------------------------------------------------------ */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 shadow-soft">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-800 font-mono">
              Applicable
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-teal-950">
                {summaryCounts.applicable}
              </span>
              <span className="text-[11px] text-teal-700">statutory / tender match</span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3 shadow-soft">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-800 font-mono">
              Conditional
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-blue-950">
                {summaryCounts.conditional}
              </span>
              <span className="text-[11px] text-blue-700">grant / scope dependent</span>
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-3 shadow-soft">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-800 font-mono">
              Recommended
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-purple-950">
                {summaryCounts.recommended}
              </span>
              <span className="text-[11px] text-purple-700">procurement guidelines</span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 shadow-soft">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900 font-mono">
              Needs Review
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-amber-950">
                {summaryCounts.needsReview}
              </span>
              <span className="text-[11px] text-amber-800">corrigendum advisory</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. FILTER TOOLBAR                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-ink-200 shadow-soft">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-semibold uppercase text-ink-400 font-mono mr-1">
            Status:
          </span>
          {[
            { id: 'all', label: `All (${rawRequirements.length})` },
            { id: 'applicable', label: `Applicable (${summaryCounts.applicable})` },
            { id: 'conditional', label: `Conditional (${summaryCounts.conditional})` },
            { id: 'recommended', label: `Recommended (${summaryCounts.recommended})` },
            { id: 'needs-review', label: `Needs Review (${summaryCounts.needsReview})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id as any)}
              className={`rounded px-2 py-0.5 text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                selectedStatus === tab.id
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
            placeholder="Search regulations & authorities…"
            className="rounded border border-ink-200 bg-ivory-50 py-1 pl-7 pr-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-teal-500 focus:bg-white focus:outline-none w-44 sm:w-56"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. REGULATORY & CERTIFICATION REQUIREMENT CARDS                   */}
      {/* ------------------------------------------------------------------ */}
      {rawRequirements.length === 0 ? (
        <div className="py-10 text-center bg-white rounded-lg border border-ink-200 shadow-soft">
          <Shield size={24} className="mx-auto mb-3 text-ink-300" />
          <h3 className="text-sm font-medium text-ink-700">No mandatory certification requirement identified for the matched standards.</h3>
          <p className="mt-1 text-xs text-ink-500">None of the matched standards are notified under a Quality Control Order or require mandatory certification.</p>
        </div>
      ) : (
      <div className="space-y-3.5">
        {filteredRequirements.map((item) => {
          const isExpanded = expandedCardId === item.id;
          const userDecision = decisions[item.id];

          return (
            <Card
              key={item.id}
              padding="md"
              className="bg-white border-ink-200 shadow-soft hover:border-ink-300 transition-all"
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-ivory-100 text-ink-700 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase">
                        {renderTypeLabel(item.type)}
                      </span>
                      {renderStatusBadge(item.status)}
                      <span className="text-ink-400 text-xs font-mono">·</span>
                      <span className="text-xs font-mono text-ink-500">
                        Authority: <strong className="text-ink-900">{item.issuingAuthority}</strong>
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-sm font-bold text-ink-900 font-sans leading-snug">
                      {item.requirement}
                    </h3>
                  </div>

                  {/* Top Action Pills */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.relatedStandardId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate({ name: 'standard', standardId: item.relatedStandardId!, analysisId: analysis.id })}
                        rightIcon={<ExternalLink size={12} />}
                      >
                        {item.relatedStandard}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Authority, Source Document & Effective Date Box */}
                <div className="grid gap-2 sm:grid-cols-3 rounded-lg border border-ink-100 bg-ivory-50/70 p-2.5 text-xs font-mono text-ink-700">
                  <div>
                    <span className="text-[10px] uppercase text-ink-400 block font-semibold">
                      Source Document / Order
                    </span>
                    <span className="font-sans font-medium text-ink-900 text-xs">
                      {item.sourceDocument}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-ink-400 block font-semibold">
                      Order Reference
                    </span>
                    <span className="text-teal-900 font-semibold">
                      {item.orderNumber || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-ink-400 block font-semibold">
                      Validity & Timeline
                    </span>
                    <span className="text-ink-600">
                      {item.validityInfo}
                    </span>
                  </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* 5. WHY DOES THIS APPLY? REASONING ACCORDION               */}
                {/* ---------------------------------------------------------- */}
                <div className="rounded-lg border border-teal-200/80 bg-teal-50/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-900 font-mono flex items-center gap-1.5">
                      <Scale size={13} className="text-teal-700" />
                      Why this may apply
                    </span>

                    <button
                      onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                      className="text-[11px] font-mono font-medium text-teal-800 hover:text-teal-950 inline-flex items-center gap-1"
                    >
                      {isExpanded ? 'Hide reasoning details' : 'Show criteria evaluation'}
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-ink-800 leading-relaxed mt-1 font-sans">
                    {item.whyAppliesText}
                  </p>

                  {/* Expanded Checklist Criteria */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2.5 pt-2 border-t border-teal-200/60 space-y-1.5 overflow-hidden"
                      >
                        {item.whyAppliesCriteria.map((crit, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            {crit.matched ? (
                              <CheckCircle2 size={13} className="mt-0.5 text-teal-700 shrink-0" />
                            ) : (
                              <HelpCircle size={13} className="mt-0.5 text-amber-600 shrink-0" />
                            )}
                            <span className="text-ink-700 font-sans">
                              {crit.text}
                              {crit.note && (
                                <span className="ml-1 text-[11px] text-amber-800 font-mono">
                                  ({crit.note})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* 6. EVIDENCE LINK & PROVENANCE CITATION                     */}
                {/* ---------------------------------------------------------- */}
                {item.evidenceAvailable && item.evidenceSnippet && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-ink-100 bg-white p-2.5 shadow-xs">
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-1.5 text-teal-900 font-mono text-[11px] font-semibold mb-0.5">
                        <FileSearch size={12} className="text-teal-700" />
                        <span>Source Evidence{item.evidenceLocation ? ` (${item.evidenceLocation})` : ''}</span>
                      </div>
                      <p className="italic text-ink-700 text-xs font-sans line-clamp-2">
                        {item.evidenceSnippet}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ name: 'analysis', analysisId: analysis.id, tab: 'evidence' })}
                      rightIcon={<ArrowRight size={12} />}
                      className="shrink-0 text-teal-800 hover:bg-teal-50"
                    >
                      View in Evidence Workspace
                    </Button>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 7. HUMAN OFFICER DECISION & REVIEW                         */}
                {/* ---------------------------------------------------------- */}
                <div className="pt-2.5 border-t border-ink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                      Officer Review:
                    </span>
                    <span className="rounded bg-ivory-100 px-2 py-0.5 text-[10px] text-ink-700">
                      {item.reviewConfidence === 'high-confidence' ? 'High Confidence Finding' : 'Review Recommended'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDecision(item.id, 'accepted')}
                      className={`py-1 px-2.5 rounded text-[11px] font-medium transition-all ${
                        userDecision === 'accepted'
                          ? 'bg-success-600 text-white shadow-soft'
                          : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                      }`}
                    >
                      <Check size={11} className="inline mr-1" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecision(item.id, 'reviewed')}
                      className={`py-1 px-2.5 rounded text-[11px] font-medium transition-all ${
                        userDecision === 'reviewed'
                          ? 'bg-warning-500 text-white shadow-soft'
                          : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                      }`}
                    >
                      <HelpCircle size={11} className="inline mr-1" />
                      Mark for Review
                    </button>
                    <button
                      onClick={() => handleDecision(item.id, 'rejected')}
                      className={`py-1 px-2.5 rounded text-[11px] font-medium transition-all ${
                        userDecision === 'rejected'
                          ? 'bg-error-600 text-white shadow-soft'
                          : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
                      }`}
                    >
                      <X size={11} className="inline mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. DECISION SUPPORT ADVISORY BANNER                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-lg border border-ink-200 bg-ivory-100 p-3 text-xs text-ink-600 flex items-start gap-2.5">
        <Info size={15} className="mt-0.5 shrink-0 text-ink-500" />
        <p className="leading-relaxed">
          ManakSetu provides decision support based on indexed tender requirements, technical orders and statutory gazette citations.
          Final procurement judgment and compliance certification verification remain with the officer.
        </p>
      </div>
    </div>
  );
}

