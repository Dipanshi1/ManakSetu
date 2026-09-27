import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  Columns,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  GitBranch,
  History,
  Layers,
  ListChecks,
  Scale,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/router';

interface StepData {
  stepNumber: string;
  title: string;
  subtitle: string;
  description: string;
  points: string[];
  uiFragment: {
    type: string;
    badge: string;
    badgeVariant: 'teal' | 'blue' | 'neutral' | 'warning' | 'success' | 'error';
    content: React.ReactNode;
  };
}

export function HowItWorksPage() {
  const { navigate } = useRouter();

  const workflowSteps: StepData[] = [
    {
      stepNumber: '01',
      title: 'Procurement Input',
      subtitle: 'Multi-modal specification intake with section hierarchy preservation',
      description:
        'Upload tender notices (NIT), Bills of Quantities (BOQ), Requests for Proposal (RFP), or technical schedules in PDF/DOCX format, or paste raw specification clauses. ManakSetu preserves tabular structures, clause numbering, and section hierarchy.',
      points: [
        'Supports PDF, DOCX, and TXT procurement documents up to 50 MB',
        'Extracts structured technical parameters, tolerances, and BOQ items',
        'Maintains section references (e.g. §3.2.1, §4.2) for provenance mapping',
      ],
      uiFragment: {
        type: 'Source Document Ingestion',
        badge: 'PARSED',
        badgeVariant: 'success',
        content: (
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between rounded bg-ivory-100/70 p-2 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-teal-700 dark:text-teal-400" />
                <span className="font-semibold text-ink-900 dark:text-white">NIT_MCD_2024_LED_Specs.pdf</span>
              </div>
              <span className="text-[10px] text-ink-400">18 pages · 42 clauses</span>
            </div>
            <div className="text-[11px] text-ink-500 font-sans italic pl-2 border-l-2 border-teal-500">
              "Clause 3.2.1: 90W–120W outdoor LED luminaire for Class A1 urban arterial highways..."
            </div>
          </div>
        ),
      },
    },
    {
      stepNumber: '02',
      title: 'Requirement Understanding',
      subtitle: 'Deconstruct scope, taxonomy, operational parameters & safety limits',
      description:
        'ManakSetu parses the tender text to understand the physical product classification, operational environment, electrical thresholds, photometric requirements, and safety conditions while filtering out standard administrative boilerplate.',
      points: [
        'Discovers product taxonomy and application scope',
        'Isolates operating conditions (ambient temperature, humidity, ingress rating)',
        'Extracts critical parameters (wattage, lumen output, efficacy, CCT, THD, surge)',
      ],
      uiFragment: {
        type: 'Requirement Deconstruction',
        badge: 'EXTRACTED',
        badgeVariant: 'teal',
        content: (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded border border-ink-100 bg-white p-2 dark:border-slate-800 dark:bg-[#111827]">
              <span className="text-[10px] text-ink-400 uppercase block">Product Taxonomy</span>
              <span className="font-semibold text-ink-900 dark:text-white text-[11px]">LED Roadway Luminaire</span>
            </div>
            <div className="rounded border border-ink-100 bg-white p-2 dark:border-slate-800 dark:bg-[#111827]">
              <span className="text-[10px] text-ink-400 uppercase block">Operating Environment</span>
              <span className="font-semibold text-ink-900 dark:text-white text-[11px]">Outdoor / IP66 / 45°C</span>
            </div>
          </div>
        ),
      },
    },
    {
      stepNumber: '03',
      title: 'Procurement Profile',
      subtitle: 'Structured, editable profile ready for technical evaluation',
      description:
        'All extracted physical parameters and constraints are assembled into a structured Procurement Profile. Officers can review, edit, or append requirements before matching against national standards repositories.',
      points: [
        'Visual status tracking: Detected (teal), Edited (blue), Needs review (amber)',
        'Editable technical parameters, performance thresholds, and laboratory tests',
        'Serves as the persistent basis for standards matching and version checks',
      ],
      uiFragment: {
        type: 'Procurement Profile Matrix',
        badge: 'PROFILE ACTIVE',
        badgeVariant: 'blue',
        content: (
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between rounded bg-teal-50/40 p-1.5 border border-teal-200/60 dark:bg-teal-950/30 dark:border-teal-800">
              <span className="font-sans font-medium text-ink-900 dark:text-slate-200">System Efficacy</span>
              <span className="font-mono text-[11px] font-bold text-teal-900 dark:text-teal-300">≥ 135 lm/W (Detected)</span>
            </div>
            <div className="flex items-center justify-between rounded bg-ivory-100/60 p-1.5 border border-ink-100 dark:bg-slate-800/40 dark:border-slate-800">
              <span className="font-sans font-medium text-ink-900 dark:text-slate-200">Harmonic Distortion</span>
              <span className="font-mono text-[11px] text-ink-700 dark:text-slate-300">THD &lt; 10% @ full load</span>
            </div>
          </div>
        ),
      },
    },
    {
      stepNumber: '04',
      title: 'Standards Intelligence',
      subtitle: 'Identify applicable Indian Standards & normative companion webs',
      description:
        'The procurement profile is matched against indexed Indian Standards (IS codes), Bureau of Indian Standards (BIS) specifications, and harmonized international standards. ManakSetu surfaces primary governing standards and secondary normative companions.',
      points: [
        'Discovers governing codes across Electrical, Mechanical, and Civil bureaus',
        'Traverses normative reference companion webs (driver safety, performance, testing)',
        'Links testing protocols and laboratory accreditation requirements',
      ],
      uiFragment: {
        type: 'Applicable Standards Web',
        badge: '7 STANDARDS IDENTIFIED',
        badgeVariant: 'teal',
        content: (
          <div className="space-y-1.5 text-xs font-mono">
            <div className="rounded border border-teal-200 bg-teal-50/50 p-2 dark:border-teal-800 dark:bg-teal-950/40">
              <div className="flex justify-between items-center">
                <span className="font-bold text-teal-950 dark:text-teal-200">IS 10322 (Part 5/Sec 3):2012</span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-1 rounded dark:bg-teal-900 dark:text-teal-300">Primary Code</span>
              </div>
              <span className="text-[11px] text-ink-600 dark:text-slate-300 font-sans block mt-0.5">Luminaires: Road and Street Lighting</span>
            </div>
          </div>
        ),
      },
    },
    {
      stepNumber: '05',
      title: 'Applicability Reasoning',
      subtitle: 'Transparent, evidence-backed evaluation of why each standard applies',
      description:
        'ManakSetu answers "Why does this standard apply?" with a transparent multi-parameter reasoning engine. It validates scope alignment, product taxonomy match, environmental parameter compatibility, and current edition status.',
      points: [
        'Calculates 91% applicability match based on technical parameter alignment',
        'Validates optical, electrical, and mechanical scope compatibility',
        'Surfaces matched clauses directly against tender specification line items',
      ],
      uiFragment: {
        type: 'Why This Standard Applies',
        badge: '91% APPLICABILITY',
        badgeVariant: 'teal',
        content: (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono text-ink-800 dark:text-slate-200">
            <div className="flex items-center gap-1 rounded bg-teal-50/60 p-1 border border-teal-200 dark:bg-teal-950/40 dark:border-teal-800">
              <CheckCircle2 size={10} className="text-teal-600 shrink-0" />
              <span>Scope match</span>
            </div>
            <div className="flex items-center gap-1 rounded bg-teal-50/60 p-1 border border-teal-200 dark:bg-teal-950/40 dark:border-teal-800">
              <CheckCircle2 size={10} className="text-teal-600 shrink-0" />
              <span>Product match</span>
            </div>
            <div className="flex items-center gap-1 rounded bg-teal-50/60 p-1 border border-teal-200 dark:bg-teal-950/40 dark:border-teal-800">
              <CheckCircle2 size={10} className="text-teal-600 shrink-0" />
              <span>Param. compat.</span>
            </div>
            <div className="flex items-center gap-1 rounded bg-teal-50/60 p-1 border border-teal-200 dark:bg-teal-950/40 dark:border-teal-800">
              <CheckCircle2 size={10} className="text-teal-600 shrink-0" />
              <span>Current edition</span>
            </div>
          </div>
        ),
      },
    },
    {
      stepNumber: '06',
      title: 'Version Intelligence',
      subtitle: 'Detect withdrawn editions, reaffirmation years & supersession history',
      description:
        'A standard must never be evaluated in isolation from its lifecycle. ManakSetu traces the full BIS chronology from origin codes through published amendments to the current reaffirmed edition.',
      points: [
        'Flags citations of withdrawn codes (e.g. obsolete IS 1944:1981 in NIT §4.2)',
        'Tracks published amendments (Amendment 1 & 2 incorporated)',
        'Confirms formal supersession (IS 10322 Part 5/Sec 3 formally replaced IS 2149)',
      ],
      uiFragment: {
        type: 'Chronology Life Cycle',
        badge: 'SUPERSEDED DETECTED',
        badgeVariant: 'warning',
        content: (
          <div className="flex items-center justify-between text-xs font-mono rounded bg-amber-50/40 p-2 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <span className="text-error-700 dark:text-rose-400 font-bold line-through">IS 1944:1981 (Withdrawn)</span>
            <span className="text-ink-400">→</span>
            <span className="text-teal-800 dark:text-teal-300 font-bold">IS 10322-5-3:2012 (Current)</span>
          </div>
        ),
      },
    },
    {
      stepNumber: '07',
      title: 'Specification Quality',
      subtitle: 'Gap analysis classifying specification coverage and potential restrictiveness',
      description:
        'The tender specification is benchmarked against actual standard requirements. Requirements are classified as Covered, Review Recommended, Missing, Conflicting, or Potentially Restrictive.',
      points: [
        'Calculates 82% specification coverage score',
        'Generates suggested tender corrigendum wording for missing clauses',
        'Highlights restrictive brand parameters (e.g. narrow 3950K–4050K CCT band)',
      ],
      uiFragment: {
        type: 'Specification Matrix',
        badge: '82% COVERAGE',
        badgeVariant: 'teal',
        content: (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between rounded bg-ivory-100 p-1.5 dark:bg-slate-800">
              <span className="font-mono text-[11px] text-ink-900 dark:text-white">Driver Surge Protection (10kV)</span>
              <span className="rounded bg-error-100 text-error-800 px-1.5 py-0.2 text-[10px] font-bold font-mono dark:bg-rose-950 dark:text-rose-300">MISSING</span>
            </div>
            <p className="text-[11px] text-ink-500 italic pl-1">Suggested wording: "Mandate ≥ 10kV internal SPD per IS 16107 (Part 2/Sec 1) Cl 10.3"</p>
          </div>
        ),
      },
    },
    {
      stepNumber: '08',
      title: 'Regulatory & Certification',
      subtitle: 'Mandatory technical orders, MeitY CRS, BIS Scheme-I & NABL testing',
      description:
        'ManakSetu validates compulsory statutory compliance orders, laboratory accreditation mandates, BEE star energy labeling guidelines, and public procurement local content policies (PPP-MII).',
      points: [
        'Surfaces mandatory MeitY Compulsory Registration Scheme (CRS) schedules',
        'Validates BIS Product Certification (Scheme-I ISI Mark)',
        'Specifies mandatory NABL accredited laboratory test report clauses',
      ],
      uiFragment: {
        type: 'Statutory Regulation Check',
        badge: 'CRS MANDATORY',
        badgeVariant: 'blue',
        content: (
          <div className="rounded border border-blue-200 bg-blue-50/40 p-2 text-xs font-mono dark:border-blue-800 dark:bg-blue-950/30">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 dark:text-blue-200">MeitY CRS Order 2012 / 2021</span>
              <span className="text-[10px] text-blue-800 dark:text-blue-300">Schedule II Item 13</span>
            </div>
            <p className="text-[11px] text-ink-600 dark:text-slate-300 font-sans mt-0.5">Mandatory safety registration for AC/DC electronic controlgear (IS 15885-2-13)</p>
          </div>
        ),
      },
    },
    {
      stepNumber: '09',
      title: 'Evidence & Human Review',
      subtitle: 'Defensible 5-step provenance chain linking tender text to officer sign-off',
      description:
        'Every finding maintains a cryptographic provenance audit trail. The officer reviews the 5-step provenance chain (Source → Interpretation → Clause → Standard → Conclusion) and records an auditable decision: Accept, Review, or Reject.',
      points: [
        'Strict separation between raw tender excerpt and system interpretation',
        'Clause-by-clause audit references with SHA-256 integrity hash',
        'Defensible human review recording officer sign-off for audit defense',
      ],
      uiFragment: {
        type: 'Provenance Decision Chain',
        badge: 'PROVENANCE VERIFIED',
        badgeVariant: 'success',
        content: (
          <div className="space-y-1.5 text-xs font-mono">
            <div className="rounded bg-ivory-100 p-1.5 dark:bg-slate-800 text-[11px] text-ink-800 dark:text-slate-200">
              NIT §3.2.1 → IS 15885-2-13 Cl 8.1 → MeitY CRS Mandatory Schedule
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-ink-400 font-sans">Officer Action:</span>
              <span className="rounded bg-success-50 text-success-800 px-2 py-0.5 text-[10px] font-bold border border-success-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                ACCEPTED & SIGNED OFF
              </span>
            </div>
          </div>
        ),
      },
    },
    {
      stepNumber: '10',
      title: 'Procurement Report',
      subtitle: 'Audit-ready technical evaluation brief and corrigendum summary export',
      description:
        'The culmination of the entire analysis is assembled into a defensible technical evaluation brief containing the procurement profile, applicable standards, version chronology, gap findings, regulatory checks, and officer sign-offs.',
      points: [
        'Exportable in PDF and structured document formats',
        'Official artifact for Technical Evaluation Committees and pre-bid clarifications',
        'Defensible evidence base to eliminate vendor disputes and audit objections',
      ],
      uiFragment: {
        type: 'Evaluation Brief Artifact',
        badge: 'AUDIT READY PDF',
        badgeVariant: 'neutral',
        content: (
          <div className="rounded border border-ink-200 bg-white p-2.5 shadow-xs text-xs dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="font-bold text-ink-900 dark:text-white">MANAKSETU-EVAL-2024-001</span>
              <span className="text-teal-700 dark:text-teal-400 font-semibold">14 Pages · Verified</span>
            </div>
            <p className="text-[11px] text-ink-500 dark:text-slate-400 font-sans mt-0.5">Official Brief for Tender Evaluation Committee · NIT #MCD-2024-LT-09</p>
          </div>
        ),
      },
    },
  ];

  return (
    <div className="min-h-screen bg-ivory-50 text-ink-900 selection:bg-teal-500/20 dark:bg-[#090D16] dark:text-slate-100">
      <TopNav variant="public" />

      {/* Header Introduction (Instructional & Technical) */}
      <section className="border-b border-ink-200 bg-white py-14 sm:py-18 dark:border-slate-800 dark:bg-[#111827]">
        <div className="container-page mx-auto max-w-4xl text-center">
          <Badge variant="teal" className="mb-3 font-mono">
            <Sparkles size={12} />
            SIH Problem Statement 26108 Architecture
          </Badge>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl md:text-5xl dark:text-white">
            How ManakSetu turns procurement input into defensible decisions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-600 dark:text-slate-400 sm:text-lg">
            Follow one tender from requirement extraction to standards intelligence, evidence and human review.
          </p>

          {/* Quick 5-Stage Summary Flow Ribbon */}
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-ink-200 bg-ivory-50 p-3 text-xs font-mono text-ink-700 shadow-soft dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-300">
            <span className="rounded bg-white px-2 py-1 font-semibold text-ink-900 dark:bg-slate-800 dark:text-white">Procurement Input</span>
            <span className="text-ink-300 dark:text-slate-600">→</span>
            <span className="rounded bg-teal-50 px-2 py-1 font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">Standards Intelligence</span>
            <span className="text-ink-300 dark:text-slate-600">→</span>
            <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">Specification Quality</span>
            <span className="text-ink-300 dark:text-slate-600">→</span>
            <span className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">Evidence Provenance</span>
            <span className="text-ink-300 dark:text-slate-600">→</span>
            <span className="rounded bg-success-50 px-2 py-1 font-semibold text-success-800 dark:bg-emerald-950 dark:text-emerald-300">Defensible Brief</span>
          </div>
        </div>
      </section>

      {/* 10-Step Connected Workflow Process */}
      <section className="py-14 sm:py-20">
        <div className="container-page mx-auto max-w-4xl space-y-6">
          {workflowSteps.map((step, i) => (
            <motion.div
              key={step.stepNumber}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
            >
              <Card padding="none" className="border-ink-200 bg-white hover:border-ink-300 transition-all shadow-soft overflow-hidden dark:border-slate-800 dark:bg-[#111827]">
                <div className="grid md:grid-cols-12">
                  {/* Left Column: Step Indicator, Title & Narrative (7 cols) */}
                  <div className="p-6 md:col-span-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-ink-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-[11px] font-mono font-bold text-white dark:bg-teal-700">
                          {step.stepNumber}
                        </span>
                        <h2 className="text-base font-bold text-ink-900 tracking-tight dark:text-white">
                          {step.title}
                        </h2>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-teal-800 dark:text-teal-400 font-mono">
                        {step.subtitle}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-ink-600 dark:text-slate-300">
                        {step.description}
                      </p>
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 dark:border-slate-800">
                      {step.points.map((pt, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px] text-ink-700 dark:text-slate-300">
                          <Check size={13} className="text-teal-600 shrink-0 mt-0.5 dark:text-teal-400" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Realistic StandIQ UI Fragment (5 cols) */}
                  <div className="p-6 md:col-span-5 bg-ivory-50/60 dark:bg-[#090D16]/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-mono dark:text-slate-500">
                          {step.uiFragment.type}
                        </span>
                        <Badge variant={step.uiFragment.badgeVariant} className="text-[10px] font-mono">
                          {step.uiFragment.badge}
                        </Badge>
                      </div>

                      <div className="rounded-lg border border-ink-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-[#111827]">
                        {step.uiFragment.content}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-ink-400 dark:text-slate-500 border-t border-ink-100 pt-2 dark:border-slate-800">
                      <span>Phase {step.stepNumber} of 10</span>
                      <span>Verified Workflow</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="border-t border-ink-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-[#111827]">
        <div className="container-page mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl dark:text-white">
            Ready to evaluate your tender specification?
          </h2>
          <p className="mt-3 text-sm text-ink-600 dark:text-slate-400">
            Upload your tender document or specification clauses to generate an audit-ready evaluation brief.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => navigate({ name: 'new-analysis' })}
              rightIcon={<ArrowRight size={17} />}
            >
              Analyze a tender
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate({ name: 'standards' })}
              leftIcon={<Search size={15} />}
            >
              Explore Standards Catalog
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

