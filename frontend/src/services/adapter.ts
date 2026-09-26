// Adapts the real FastAPI backend payloads (see services/api.js) into the
// improved-UI data model declared in data/types.ts. The backend returns
// { standards[], findings[], requirements[], tender_title, metadata, status, ... }
// while the UI tabs consume Analysis / Standard / SpecificationRequirement / etc.
import type {
  Analysis,
  AnalysisStatus,
  EvidenceChainItem,
  HumanReviewConfidence,
  MatchedRequirementItem,
  RegulatoryRequirement,
  SpecificationRequirement,
  Standard,
  StandardRelationship,
  StandardStatus,
} from '@/data/types';
import {
  isLedDemoRaw,
  LED_STANDARDS,
  LED_SPEC_REQUIREMENTS,
  LED_REGULATORY,
  LED_EVIDENCE,
  LED_RELATIONSHIPS,
} from '@/data/ledDemoFixture';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---- small helpers ---------------------------------------------------------

function cleanTitle(raw = ''): string {
  const cutoffs = [' This standard is available', ' This Standard is available', 'NOTE -', 'Note -', '(Please refer', 'For Printed copies'];
  let t = raw;
  for (const c of cutoffs) {
    const idx = t.indexOf(c);
    if (idx > 20) t = t.slice(0, idx);
  }
  return t.trim().replace(/\s+/g, ' ');
}

function norm(c: unknown): number {
  const n = typeof c === 'number' ? c : Number(c) || 0;
  return n > 1 ? n / 100 : n;
}

function confBand(c: unknown): HumanReviewConfidence {
  const n = norm(c);
  if (n >= 0.75) return 'high-confidence';
  if (n >= 0.4) return 'needs-review';
  return 'insufficient-evidence';
}

function mapStandardStatus(status = ''): StandardStatus {
  const s = status.toLowerCase();
  if (s.includes('supersed')) return 'superseded';
  if (s.includes('withdraw')) return 'withdrawn';
  // backend enum: active | under_revision | reaffirmed | superseded | withdrawn | unknown
  if (s.includes('review') || s.includes('revis')) return 'under-review';
  if (s.includes('amend')) return 'amended';
  return 'current';
}

// Withdrawn and superseded standards are no longer citable, whatever their
// retrieval score.
export function isRetiredStandard(std: { status: StandardStatus }): boolean {
  return std.status === 'withdrawn' || std.status === 'superseded';
}

// applicabilityScore is scaled per retrieval query (score / best score of that
// query), so it ranks within a requirement but is not an absolute measure.
export const RETRIEVAL_MATCH_TOOLTIP =
  'Relative to the best catalogue match for the requirement that retrieved it; not an applicability score.';

export function retrievalMatchLabel(score?: number | null): string | null {
  if (score == null) return null;
  if (score >= 100) return 'Top match';
  if (score >= 70) return 'Strong';
  return 'Partial';
}

function mapAnalysisStatus(status = ''): AnalysisStatus {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'partially_completed') return 'completed';
  if (s === 'failed') return 'failed';
  // queued | extracting | retrieving | analyzing | enriching are all in-flight
  return 'processing';
}

// finding.verdict is one of ~11 backend verdicts; collapse to UI statuses.
function verdictToSpecStatus(verdict = '', isReference?: string | null): SpecificationRequirement['status'] {
  const v = verdict.toLowerCase();
  if (v === 'justified') return 'covered';
  if (v.includes('restrict')) return 'restrictive';
  
  // A standard cited outside its scope, or simply the wrong standard, is mapped to review
  if (v.includes('conflict') || v.includes('wrong_scope') || v.includes('incorrect')) {
    return 'review';
  }
  
  if (v.includes('missing') || v.includes('not_found') || v.includes('absent')) return 'missing';
  return 'review';
}

function verdictToMatchedStatus(verdict = ''): MatchedRequirementItem['status'] {
  const v = verdict.toLowerCase();
  if (v === 'justified') return 'covered';
  if (v.includes('conflict') || v.includes('wrong_scope') || v.includes('incorrect')) return 'needs-review';
  if (v.includes('missing') || v.includes('not_found') || v.includes('absent')) return 'not-found';
  if (v.includes('partial')) return 'partial';
  return 'needs-review';
}

function verdictToEvidenceStatus(verdict = ''): EvidenceChainItem['status'] {
  const v = verdict.toLowerCase();
  if (v === 'justified') return 'supported';
  if (v.includes('missing') || v.includes('not_found') || v.includes('absent')) return 'not-found';
  if (v.includes('partial')) return 'partial';
  return 'needs-review';
}

function cleanReasoning(reason: string = ''): string {
  if (!reason) return '';
  if (reason.includes('429 RESOURCE_EXHAUSTED')) {
    // Return a clean user-facing error message instead of the raw JSON dump
    return "AI reasoning unavailable: Gemini API quota exceeded (429 RESOURCE_EXHAUSTED). The requirement was processed using fallback logic.";
  }
  return reason;
}

// ---- cited vs applicable ---------------------------------------------------
//
// The backend keeps these apart on purpose. `applicable_standards` are the ones
// that genuinely govern the requirement; `cited_standards` are what the tender
// actually named. Usually they overlap. When the tender names the wrong
// standard they do not: applicable comes back empty and the offending citation
// sits in cited_standards with `dimensions.scope` explaining why.
//
// Reading only `applicable_standards[0]` therefore blanked out the single most
// valuable finding the system produces — a tender specifying XLPE while citing
// IS 1554, which covers PVC, rendered as "Not mapped" with the reason dropped.
// The analysis had identified the standard, named the correct alternatives, and
// none of it reached the screen.

function displayStandard(f: any): { std: any; wronglyCited: boolean } {
  const applicable = f?.applicable_standards?.[0];
  if (applicable) return { std: applicable, wronglyCited: false };
  const cited = f?.cited_standards?.[0];
  if (cited) return { std: cited, wronglyCited: true };
  return { std: undefined, wronglyCited: false };
}

// What to show where a standard designation is expected. "Not mapped" is only
// honest when nothing was identified at all; when a standard was cited and
// judged inapplicable, saying so is the finding.
function standardLabel(f: any, absent: string): string {
  // If there are applicable standards, join all of them
  if (f?.applicable_standards?.length > 0) {
    return f.applicable_standards
      .map((s: any) => s.designation || s.is_number || absent)
      .join(', ');
  }

  // Fallback to the cited standard if wrongly cited
  const cited = f?.cited_standards?.[0];
  if (cited) {
    const designation = cited.designation || cited.is_number || absent;
    return `${designation} (cited — see finding)`;
  }

  return absent;
}

// The deterministic scope check's own words, when it made a judgement. Prefer
// it over the generic reasoning: it names the material, the standard's actual
// coverage, and the alternatives in the catalogue.
function scopeNote(f: any): string {
  const scope = f?.dimensions?.scope;
  return scope?.assessed && scope?.mismatch && scope?.note ? String(scope.note) : '';
}

function explain(f: any): string {
  const note = scopeNote(f);
  const reason = cleanReasoning(f?.reason || '');
  if (!note) return reason;
  return reason ? `${note}\n\n${reason}` : note;
}

// ---- standards -------------------------------------------------------------

export function adaptStandard(raw: any): Standard {
  const number = raw.designation || raw.is_number || raw.number || 'IS —';
  const title = cleanTitle(raw.title || raw.standardTitle || number);
  const references: string[] = raw.normative_references || raw.references || [];
  const scope = raw.scope || raw.text_excerpt || `Indian Standard specifying requirements for: ${title.slice(0, 120)}.`;
  const qco = Boolean(raw.qco_notified);
  const year = raw.year_published || raw.year || (raw.latest_version && Number(String(raw.latest_version).replace(/[^0-9]/g, ''))) || 0;

  return {
    id: String(raw.id ?? number),
    number,
    title,
    category: raw.division_council || raw.category || 'BIS Catalog',
    edition: String(raw.latest_version || raw.edition || year || ''),
    revision: raw.status ? (String(raw.status) === 'unknown' ? 'Active' : String(raw.status).replace(/_/g, ' ')) : 'Current',
    status: mapStandardStatus(raw.status),
    bureau: 'BIS',
    section: raw.ics_code || raw.section || '',
    yearPublished: Number(year) || 0,
    lastUpdatedDate: raw.transition_deadline || raw.last_updated_date,
    pages: raw.pages || 0,
    summary: scope,
    keywords: raw.keywords || [],
    referencedBy: raw.referenced_by || [],
    references,
    isCertified: qco,
    certificationBody: qco ? (raw.required_certification_scheme || 'BIS') : null,
    regulatory: qco,
    regulatoryNote: qco ? 'Notified under a Quality Control Order — BIS certification mandatory.' : null,
    supersededBy: raw.superseded_by || undefined,
    amendments: raw.amendments || [],
    committee: raw.technical_committee || raw.committee || undefined,
    ministry: raw.ministry || undefined,
    internationalEquivalents: raw.equivalents || raw.internationalEquivalents || (raw.ics_code ? [raw.ics_code] : []),
    technicalCoverage: raw.text_excerpt || undefined,
    whyApplies: cleanReasoning(raw.why_recommended || raw.text_excerpt || scope),
    applicabilityScore: (raw.relevance_score || raw.semantic_score || raw.applicability_score) ? Math.round(norm(raw.relevance_score || raw.semantic_score || raw.applicability_score) * 100) : undefined,
    evidenceAvailable: Array.isArray(raw.evidence) ? raw.evidence.length > 0 : undefined,
    bisSourceUrl: raw.source_url || (raw.provenance?.url) || undefined,
    retrievedAt: raw.retrieved_at || undefined,
    fieldAvailability: raw.field_availability || undefined,
  };
}

// ---- full analysis ---------------------------------------------------------

export interface AdaptedAnalysis {
  analysis: Analysis;
  standards: Standard[];
  primaryStandard: Standard | null;
  matchedRequirements: MatchedRequirementItem[];
  specRequirements: SpecificationRequirement[];
  regulatory: RegulatoryRequirement[];
  evidence: EvidenceChainItem[];
  relationships: StandardRelationship[];
  degradedReason?: string | null;
  analysisMode?: string;
}

export function adaptAnalysis(raw: any): AdaptedAnalysis {
  const rawStandards: any[] = raw?.standards || [];
  
  // Exclude logically deleted findings and their corresponding requirements
  const allFindings: any[] = raw?.findings || [];
  const findings: any[] = allFindings.filter((f) => f.officer_decision !== 'deleted');
  const deletedReqIds = new Set(allFindings.filter((f) => f.officer_decision === 'deleted').map((f) => f.requirement_id));
  const requirements: any[] = (raw?.requirements || []).filter((r: any) => !deletedReqIds.has(r.id));

  const standards = rawStandards.map(adaptStandard);
  const stdById = new Map(standards.map((s, i) => [String(rawStandards[i].id ?? s.id), s]));

  // Build a map of standard id -> number of findings that list it as applicable.
  // This is computed before sort so we can use it as the primary ranking key.
  const reqCountByStdId = new Map<string, number>();
  for (const f of findings) {
    const applicable: any[] = f?.applicable_standards || [];
    const ids: string[] = applicable.length > 0
      ? applicable.map((s: any) => String(s.id))
      : (f?.applicable_standard_ids || []).map(String);
    for (const sid of ids) {
      reqCountByStdId.set(sid, (reqCountByStdId.get(sid) || 0) + 1);
    }
  }

  // Sort: withdrawn/superseded standards last, so a retired standard can never be
  // the primary code; then matched-requirement count (more is better);
  // then applicabilityScore (higher ML score is better).
  // This prevents IS 1356 with 1 requirement from outranking IS 302 with 5.
  standards.sort((a, b) => {
    const retiredDiff = Number(isRetiredStandard(a)) - Number(isRetiredStandard(b));
    if (retiredDiff !== 0) return retiredDiff;
    const countDiff = (reqCountByStdId.get(b.id) || 0) - (reqCountByStdId.get(a.id) || 0);
    if (countDiff !== 0) return countDiff;
    return (b.applicabilityScore || 0) - (a.applicabilityScore || 0);
  });

  // The highest ranked standard is the primary code
  if (standards[0]) standards[0].relationshipRole = 'primary';
  const findingFor = (reqId: string) => findings.find((f) => f.requirement_id === reqId);

  const analysisId = String(raw?.id ?? '');

  const matchedRequirements: MatchedRequirementItem[] = requirements.map((r) => {
    const f = findingFor(r.id);
    const { std } = displayStandard(f);
    
    const locationStr = r.location 
      ? (r.page ? `Page ${r.page}, ${r.location}` : r.location)
      : (r.category?.replace(/_/g, ' ') || '');
      
    return {
      id: r.id,
      requirement: r.text || r.category || 'Requirement',
      parameterValue: '', // backend requirements carry no separate value field

      standardCode: standardLabel(f, 'Not mapped'),
      standardId: std?.id ? String(std.id) : '',
      standardIds: f?.applicable_standards?.map((s: any) => String(s.id)) || (std?.id ? [String(std.id)] : []),
      clause: locationStr,
      status: verdictToMatchedStatus(f?.verdict),
      evidenceSnippet: scopeNote(f) || f?.evidence?.[0]?.excerpt,
      evidenceSource: f?.evidence?.[0]?.authority || f?.evidence?.[0]?.source_type,
      reviewConfidence: confBand(f?.confidence ?? r.extraction_confidence),
    };
  });

  const specRequirements: SpecificationRequirement[] = requirements.map((r) => {
    const f = findingFor(r.id);
    const { std } = displayStandard(f);
    
    // Construct location string with page if available
    const locationStr = r.location 
      ? (r.page ? `Page ${r.page}, ${r.location}` : r.location)
      : (r.category?.replace(/_/g, ' ') || '');

    return {
      id: r.id,
      analysisId,
      requirement: r.text || r.category || 'Requirement',
      tenderEvidence: r.text || f?.evidence?.[0]?.excerpt || '',
      tenderSection: locationStr,
      applicableStandard: standardLabel(f, 'Not mapped'),
      standardId: std?.id ? String(std.id) : '',
      standardIds: f?.applicable_standards?.map((s: any) => String(s.id)) || (std?.id ? [String(std.id)] : []),
      standardCompliance: f?.standard_compliance_notes || {},
      clause: '',
      status: verdictToSpecStatus(f?.verdict, r.is_reference),
      whyMatters: explain(f),
      supportingEvidence: f?.evidence?.[0]?.excerpt,
      suggestedAction: f?.recommended_action,
      reviewConfidence: confBand(f?.confidence ?? r.extraction_confidence),
      originalVerdict: f?.verdict,
      isReference: !!r.is_reference,
    };
  });

  const regulatory: RegulatoryRequirement[] = standards
    .filter((s) => s.regulatory)
    .map((s) => {
      // Find the raw standard from get_analysis response if possible
      const rawS = raw?.standards?.find((rs: any) => String(rs.id) === String(s.id)) || {};
      return {
        id: `reg-${s.id}`,
        analysisId,
        requirement: `BIS certification — ${s.number}`,
        type: 'certification',
        status: 'applicable',
        relatedStandard: s.number,
        relatedStandardId: s.id,
        issuingAuthority: rawS.qco_issuing_ministry || 'Bureau of Indian Standards (BIS)',
        sourceDocument: 'Quality Control Order notification',
        orderNumber: rawS.qco_gazette_so_number || '-',
        effectiveDate: rawS.qco_effective_date || '-',
        validityInfo: rawS.qco_effective_date ? `Effective from ${rawS.qco_effective_date}` : 'Active / Mandatory',
        whyAppliesText: s.regulatoryNote || `${s.number} is notified under a Quality Control Order; BIS certification is mandatory for supply.`,
        whyAppliesCriteria: [
          { text: `Standard ${s.number} is officially notified by ${rawS.qco_issuing_ministry || 'MeitY/DPIIT/BIS'}`, matched: true },
          { text: 'Mandatory BIS certification is required for vendor eligibility', matched: true }
        ],
        evidenceAvailable: true,
        reviewConfidence: 'high-confidence',
      };
    });

  const evidence: EvidenceChainItem[] = findings.map((f) => {
    const r = requirements.find((x) => x.id === f.requirement_id);
    const ev = f.evidence?.[0];
    const { std } = displayStandard(f);
    
    const locationStr = r?.location 
      ? (r.page ? `Page ${r.page}, ${r.location}` : r.location)
      : (r?.category?.replace(/_/g, ' ') || '');

    return {
      id: f.id,
      analysisId,
      requirement: r?.text || String(f.verdict || '').replace(/_/g, ' ') || 'Finding',
      standard: standardLabel(f, 'No mapped standard'),
      standardId: std?.id ? String(std.id) : undefined,
      clause: '',
      evidence: ev?.excerpt || f.reason || '',
      sourceDoc: ev?.authority || ev?.source_type || 'Procurement analysis',
      sourceLocation: locationStr || ev?.gazette_so_number || ev?.source_type || '',
      status: verdictToEvidenceStatus(f.verdict),
      conclusion: explain(f),
      reviewConfidence: confBand(f.confidence),
    };
  });

  const allRelationships = findings.flatMap((f) =>
    (f.cross_references || []).flatMap((xref: any, fi: number) =>
      (xref.references || []).slice(0, 4).map((ref: string, ri: number) => ({
        id: `rel-${f.id}-${fi}-${ri}`,
        analysisId,
        fromStandardId: xref.source || '',
        toStandardId: ref,
        type: 'references' as const,
        label: `${xref.source_designation || xref.source} → ${ref}`,
        description: xref.note || `${xref.source_designation || xref.source} cites ${ref} as a normative reference.`,
      })),
    ),
  );
  
  // Deduplicate relationships by from/to pairs
  const uniquePairs = new Set<string>();
  const relationships: StandardRelationship[] = [];
  for (const rel of allRelationships) {
    const key = `${rel.fromStandardId}->${rel.toStandardId}`;
    if (!uniquePairs.has(key)) {
      uniquePairs.add(key);
      relationships.push(rel);
    }
  }
  
  // Inject superseding relationships dynamically for real standards
  standards.forEach((std) => {
    if (std.supersededBy) {
      const cleanSup = std.supersededBy.replace(/\s/g, '').toLowerCase();
      const newStd = standards.find(s => s.number.replace(/\s/g, '').toLowerCase() === cleanSup || (s.title && s.title.replace(/\s/g, '').toLowerCase() === cleanSup));
      if (newStd) {
        relationships.push({
          id: `rel-sup-${std.id}-${newStd.id}`,
          analysisId,
          fromStandardId: newStd.id,
          toStandardId: std.id,
          type: 'supersedes' as any,
          role: 'supersedes' as any,
          label: 'Superseded By',
          description: `Standard ${std.number} has been officially superseded by ${newStd.number}.`
        });
      }
    }
  });

  const gapsFound = findings.filter((f) => (f.verdict || '').toLowerCase() !== 'justified').length;
  
  const validScores = standards
    .map(s => s.applicabilityScore)
    .filter((s): s is number => s !== undefined && s > 0);
  const avgConfidence = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;


  const qcoCount = raw?.qco_findings?.length || 0;
  const testingCount = raw?.product_profile?.testingRequirements?.length || 0;
  const totalCertifications = (qcoCount + testingCount) > 0 ? (qcoCount + testingCount) : regulatory.length;
  const analysis: Analysis = {
    id: analysisId,
    title: raw?.tender_title || raw?.metadata?.tender_title || 'Procurement analysis',
    category: raw?.metadata?.category || 'BIS analysis',
    status: mapAnalysisStatus(raw?.status),
    createdAt: raw?.created_at || '',
    completedAt: raw?.updated_at || null,
    documentCount: raw?.input_type?.toLowerCase() === 'document' ? 1 : 0,
    standardsIdentified: standards.length,
    gapsFound,
    certificationsRequired: totalCertifications,
    confidence: avgConfidence,
    // The backend writes a real one-line summary ("3 requirement(s) analysed
    // against 1 BIS standard(s)…"). It used to be discarded in favour of
    // degraded_reason, which is null on a healthy run — so the summary line was
    // blank exactly when the analysis had gone well. degradedReason is returned
    // separately below and the banner reads it from there.
    summary: raw?.summary || raw?.degraded_reason || null,
    matchedStandardIds: standards.map((s) => s.id),
    gapIds: specRequirements.filter((s) => s.status !== 'covered').map((s) => s.id),
    documentIds: raw?.tender_id ? [String(raw.tender_id)] : [],
    qco_findings: raw?.qco_findings || [],
    product_profile: raw?.product_profile || null,
  };

    return {
    analysis,
    standards,
    primaryStandard: standards[0] || null,
    matchedRequirements,
    specRequirements,
    regulatory,
    evidence,
    relationships,
    degradedReason: raw?.degraded_reason ?? null,
    analysisMode: raw?.analysis_mode,
  };
}

// Summary rows for list pages (Reports / Workspace / History). The list endpoint
// returns { analysis_id, status, tender_title, total_requirements, issues_found, ... }
// and does NOT include standards/findings, so the gap count comes from issues_found.
export function adaptAnalysisSummary(raw: any): Analysis {
  return {
    id: String(raw?.analysis_id ?? raw?.id ?? ''),
    title: raw?.tender_title || raw?.title || 'Procurement analysis',
    category: raw?.metadata?.category || raw?.category || 'BIS analysis',
    status: mapAnalysisStatus(raw?.status),
    createdAt: raw?.created_at || '',
    completedAt: raw?.updated_at || null,
    documentCount: raw?.input_type?.toLowerCase() === 'document' ? 1 : 0,
    standardsIdentified: 0,
    gapsFound: raw?.issues_found ?? 0,
    certificationsRequired: 0,
    confidence: 0,
    summary: raw?.summary || null,
    matchedStandardIds: [],
    gapIds: [],
    documentIds: [],
  };
}

export type StatusBadgeInfo = {
  label: string;
  variant: 'neutral' | 'teal' | 'blue' | 'success' | 'warning' | 'error' | 'outline';
};

// Map a raw backend analysis status (queued | extracting | retrieving | analyzing |
// enriching | completed | partially_completed | failed) → label + Badge variant.
export function statusBadge(status = ''): StatusBadgeInfo {
  switch (status.toLowerCase()) {
    case 'completed': return { label: 'Completed', variant: 'success' };
    case 'partially_completed': return { label: 'Partial', variant: 'warning' };
    case 'failed': return { label: 'Failed', variant: 'error' };
    case 'queued': return { label: 'Queued', variant: 'neutral' };
    case 'extracting': return { label: 'Extracting text', variant: 'blue' };
    case 'retrieving': return { label: 'Retrieving standards', variant: 'blue' };
    case 'analyzing': return { label: 'Analyzing', variant: 'blue' };
    case 'enriching': return { label: 'Enriching', variant: 'blue' };
    default: return { label: status ? status.replace(/_/g, ' ') : 'Unknown', variant: 'neutral' };
  }
}
