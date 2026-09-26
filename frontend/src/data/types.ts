export type StandardStatus = 'current' | 'under-review' | 'superseded' | 'withdrawn' | 'amended';

export type AnalysisStatus = 'completed' | 'processing' | 'draft' | 'failed';

export type GapSeverity = 'high' | 'medium' | 'low';

export type RelationshipType = 'references' | 'referenced-by' | 'superseded-by' | 'companion';

export type ReportType = 'compliance' | 'gap-analysis' | 'certification';

export type DocumentType = 'pdf' | 'docx' | 'xlsx';

export interface ProcurementCategory {
  id: string;
  name: string;
  code: string;
  standardCount: number;
  description: string;
}

export type StandardRelationshipRole = 'primary' | 'normative' | 'testing' | 'safety' | 'installation' | 'related';
export type MatchedRequirementStatus = 'covered' | 'partial' | 'needs-review' | 'not-found' | 'conflicting';
export type HumanReviewConfidence = 'high-confidence' | 'needs-review' | 'insufficient-evidence';
export type HumanDecision = 'accepted' | 'reviewed' | 'rejected';

export interface Standard {
  id: string;
  number: string;
  title: string;
  category?: string;
  edition: string;
  revision: string;
  status: StandardStatus;
  bureau: string;
  section: string;
  yearPublished: number;
  lastUpdatedDate?: string;
  pages: number;
  summary: string;
  keywords: string[];
  referencedBy: string[];
  references: string[];
  isCertified: boolean;
  certificationBody: string | null;
  regulatory: boolean;
  regulatoryNote: string | null;
  supersededBy?: string;
  previousEdition?: string;
  amendments?: any[]; // string from mock, object from backend
  committee?: string;
  ministry?: string;
  technicalCoverage?: string;
  testingRequirements?: string;
  internationalEquivalents?: string[];
  relationshipRole?: StandardRelationshipRole;
  applicabilityScore?: number;
  whyApplies?: string;
  whyAppliesReasons?: { category: string; description: string; matched: boolean }[];
  evidenceAvailable?: boolean;
  reviewConfidence?: HumanReviewConfidence;
  humanDecision?: HumanDecision;
  bisSourceUrl?: string;
  retrievedAt?: string;
  fieldAvailability?: Record<string, string>;
}


export interface MatchedRequirementItem {
  id: string;
  requirement: string;
  parameterValue: string;
  standardCode: string;
  standardId: string;
  standardIds?: string[];
  clause: string;
  status: MatchedRequirementStatus;
  evidenceSnippet?: string;
  evidenceSource?: string;
  reviewConfidence: HumanReviewConfidence;
  decision?: HumanDecision;
}

export type SpecificationRequirementStatus =
  | 'covered'
  | 'review'
  | 'missing'
  | 'conflicting'
  | 'restrictive';

export interface SpecificationRequirement {
  id: string;
  analysisId: string;
  requirement: string;
  tenderEvidence: string;
  tenderSection: string;
  applicableStandard: string;
  standardId: string;
  standardIds?: string[];
  standardCompliance?: Record<string, any>;
  clause: string;
  status: SpecificationRequirementStatus;
  whyMatters: string;
  supportingEvidence?: string;
  suggestedAction?: string;
  suggestedWording?: string;
  reviewConfidence: HumanReviewConfidence;
  decision?: HumanDecision;
  restrictivenessNote?: string;
  restrictivenessConfidence?: HumanReviewConfidence;
  originalVerdict?: string;
  isReference?: boolean;
}

export type RegulatoryRequirementType =
  | 'certification'
  | 'regulatory-order'
  | 'testing-accreditation'
  | 'authority-requirement'
  | 'procurement-condition';

export type RegulatoryRequirementStatus =
  | 'applicable'
  | 'conditional'
  | 'recommended'
  | 'needs-review'
  | 'insufficient-evidence'
  | 'not-established';

export interface RegulatoryRequirement {
  id: string;
  analysisId: string;
  requirement: string;
  type: RegulatoryRequirementType;
  status: RegulatoryRequirementStatus;
  relatedStandard: string;
  relatedStandardId?: string;
  issuingAuthority: string;
  sourceDocument: string;
  orderNumber?: string;
  effectiveDate?: string;
  validityInfo?: string;
  whyAppliesText: string;
  whyAppliesCriteria: { text: string; matched: boolean; note?: string }[];
  evidenceAvailable: boolean;
  evidenceSnippet?: string;
  evidenceLocation?: string;
  evidenceId?: string;
  reviewConfidence: HumanReviewConfidence;
  decision?: HumanDecision;
}

export type EvidenceStatus = 'supported' | 'partial' | 'needs-review' | 'not-found';


export interface EvidenceChainItem {
  id: string;
  analysisId?: string;
  requirement: string;
  standard: string;
  standardId?: string;
  clause: string;
  evidence: string;
  sourceDoc: string;
  sourceLocation: string;
  status?: EvidenceStatus;
  conclusion: string;
  reviewConfidence?: HumanReviewConfidence;
  decision?: HumanDecision;
  isSaved?: boolean;
  isFlagged?: boolean;
}



export interface Document {
  id: string;
  analysisId: string;
  name: string;
  type: DocumentType;
  size: string;
  uploadedAt: string;
  pages: number;
  extractedText: boolean;
}

export interface Analysis {
  standard_decisions?: Record<string, any>;
  finding_decisions?: Record<string, any>;
  id: string;
  title: string;
  category: string;
  status: AnalysisStatus;
  createdAt: string;
  completedAt: string | null;
  documentCount: number;
  standardsIdentified: number;
  gapsFound: number;
  certificationsRequired: number;
  confidence: number;
  summary: string | null;
  matchedStandardIds: string[];
  gapIds: string[];
  documentIds: string[];
  qco_findings?: any[];
  product_profile?: any;
}

export interface Gap {
  id: string;
  analysisId: string;
  severity: GapSeverity;
  title: string;
  description: string;
  recommendation: string;
  section: string;
  relatedStandardId: string;
}

export interface StandardRelationship {
  id: string;
  analysisId: string;
  fromStandardId: string;
  toStandardId: string;
  type: RelationshipType;
  role?: StandardRelationshipRole | 'equivalent' | 'supersedes' | 'amends';
  label?: string;
  clause?: string;
  description: string;
  whyMatters?: string;
  evidenceSnippet?: string;
  evidenceSource?: string;
}


export interface Report {
  id: string;
  analysisId: string;
  title: string;
  type: ReportType;
  generatedAt: string;
  format: string;
  pages: number;
  status: 'ready' | 'generating' | 'draft' | 'failed';
  author: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarInitials: string;
  analysesCount: number;
  lastActive: string;
}

export interface Activity {
  id: string;
  memberId: string;
  action: string;
  target: string;
  timestamp: string;
}

export type ProfileFieldStatus = 'detected' | 'edited' | 'needs-review' | 'not-found';


export interface ProfileParameter {
  id: string;
  label: string;
  value: string;
  originalValue?: string;
  status: ProfileFieldStatus;
  sourceClause?: string;
}

export interface ProcurementProfile {
  product: string;
  category: string;
  application: string;
  environment: string;
  technicalParameters: ProfileParameter[];
  performanceRequirements: ProfileParameter[];
  testingRequirements: ProfileParameter[];
  regulatoryMentions: ProfileParameter[];
}

