import { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileSearch,
  FileText,
  GitBranch,
  Layers,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useRouter } from '@/router';
import { useAuth } from '@/auth/AuthContext';

// Hero animation variants
const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function LandingPage() {
  const { navigate } = useRouter();
  const { isAuthenticated } = useAuth();
  const [heroActiveTab, setHeroActiveTab] = useState<'standards' | 'issues' | 'profile' | 'evidence'>('standards');

  return (
    <div className="min-h-screen bg-ivory-50 text-ink-900 selection:bg-teal-500/20 dark:bg-[#090D16] dark:text-slate-100">

      <TopNav variant="public" />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-ink-200 bg-ivory-50/60">
        <div className="absolute inset-0 grid-bg opacity-35 pointer-events-none" />
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />

        <div className="container-page relative pt-16 pb-20 sm:pt-20 sm:pb-28">
          <motion.div
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-4xl text-center"
          >
            {/* Header Badge */}
            <motion.div variants={heroItemVariants} className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink-200/90 bg-white/90 px-3.5 py-1 text-xs font-medium text-ink-700 shadow-soft backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-teal-500" />
              <span className="font-semibold text-ink-900">StandIQ</span>
              <span className="text-ink-300">|</span>
              <span>Procurement Intelligence Workspace</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={heroItemVariants}
              className="text-balance text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl md:text-[3.4rem] md:leading-[1.14]"
            >
              From procurement requirements to{' '}
              <span className="font-serif italic font-normal text-teal-800">
                defensible standards intelligence
              </span>
              .
            </motion.h1>

            {/* Supporting Message */}
            <motion.p
              variants={heroItemVariants}
              className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-ink-600 sm:text-lg"
            >
              Analyze tenders and technical specifications to identify applicable standards, related references,
              current versions, regulatory requirements, specification gaps and evidence.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={heroItemVariants}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                onClick={() => navigate(isAuthenticated ? { name: 'new-analysis' } : { name: 'signin', redirect: '/new-analysis' })}
                rightIcon={<ArrowRight size={17} />}
                className="shadow-card active:scale-[0.98] transition-transform"
              >
                Analyze a tender
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate({ name: 'how-it-works' })}
                className="active:scale-[0.98] transition-transform"
              >
                See how it works
              </Button>
            </motion.div>

            <motion.p variants={heroItemVariants} className="mt-4 text-xs text-ink-400 font-mono">
              Engineered for Technical Evaluation Committees, Procurement Officers & Specification Authors
            </motion.p>
          </motion.div>

          {/* Hero Visual: Realistic Product Preview (LED Street Lighting Example) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 sm:mt-16"
          >
            <div className="mx-auto max-w-5xl rounded-xl border border-ink-200 bg-white shadow-pop overflow-hidden transition-all duration-300 hover:border-ink-300/80">
              {/* Product Preview Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-ivory-100/80 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-error-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success-400/80" />
                  </div>
                  <span className="text-ink-300">|</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink-800">
                      Tender Analysis: NIT #MCD-2024-LT-09
                    </span>
                    <span className="badge-teal text-[11px] font-medium">LED Street Lighting Luminaire</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-success-700 font-medium bg-success-50 px-2.5 py-0.5 rounded border border-success-200/60 shadow-soft">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                    Analysis Complete
                  </span>
                  <span className="text-ink-400 hidden sm:inline font-mono text-[11px]">
                    ID: an-led-90w · 4.1s
                  </span>
                </div>
              </div>

              {/* KPI Summary Strip */}
              <div className="grid grid-cols-2 divide-x divide-ink-100 border-b border-ink-200 bg-white sm:grid-cols-4">
                <div className="p-3.5 sm:px-5">
                  <p className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">Applicable Standards</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold text-ink-900 tabular-nums">7</span>
                    <span className="text-xs text-teal-700 font-medium">Mapped to IS codes</span>
                  </div>
                </div>
                <div className="p-3.5 sm:px-5">
                  <p className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">Related References</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold text-ink-900 tabular-nums">4</span>
                    <span className="text-xs text-blue-700 font-medium">Normative links</span>
                  </div>
                </div>
                <div className="p-3.5 sm:px-5 border-t sm:border-t-0">
                  <p className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">Issues Detected</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold text-warning-700 tabular-nums">3</span>
                    <span className="text-xs text-ink-500">1 obsolete, 2 gaps</span>
                  </div>
                </div>
                <div className="p-3.5 sm:px-5 border-t sm:border-t-0">
                  <p className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">Evidence Status</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-success-700">Verified</span>
                    <span className="text-xs text-success-700 font-medium">Clause-cited</span>
                  </div>
                </div>
              </div>

              {/* Interactive Preview Tabs */}
              <div className="flex border-b border-ink-200 bg-ivory-50/50 px-4 sm:px-6 gap-1 pt-2">
                {[
                  { id: 'standards', label: 'Applicable Standards (7)' },
                  { id: 'issues', label: 'Issues & Gaps (3)' },
                  { id: 'profile', label: 'Procurement Profile' },
                  { id: 'evidence', label: 'Traceable Evidence' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setHeroActiveTab(tab.id as any)}
                    className={`relative px-3 py-2 text-xs font-medium transition-colors ${
                      heroActiveTab === tab.id
                        ? 'text-ink-900 font-semibold'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    {heroActiveTab === tab.id && (
                      <motion.div
                        layoutId="heroTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-900"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content Display */}
              <div className="p-4 sm:p-6 bg-white min-h-[290px]">
                <motion.div
                  key={heroActiveTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {heroActiveTab === 'standards' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-ink-400 px-2 pb-1 border-b border-ink-100 font-mono">
                        <span>Standard & Designation</span>
                        <span>Version & Status</span>
                      </div>

                      {[
                        {
                          code: 'IS 10322 (Part 5/Sec 3):2012',
                          title: 'Luminaires: Particular Requirements - Road and Street Lighting',
                          status: 'Current · Reaffirmed 2022',
                          badge: 'Mandatory',
                          badgeVariant: 'teal' as const,
                          detail: 'Includes Amendment 1 & 2 · Replaces IS 2149:1970',
                        },
                        {
                          code: 'IS 15885 (Part 2/Sec 13):2012',
                          title: 'Lamp Controlgear: AC/DC Supplied Electronic Controlgear for LED Modules',
                          status: 'Current · Compulsory Registration',
                          badge: 'CRS Mandatory',
                          badgeVariant: 'blue' as const,
                          detail: 'Thermal protection, safety isolation & voltage tolerance',
                        },
                        {
                          code: 'IS 16107 (Part 2/Sec 1):2012',
                          title: 'Luminaires Performance: LED Luminaire Performance Requirements',
                          status: 'Current · Reaffirmed 2022',
                          badge: 'Performance',
                          badgeVariant: 'neutral' as const,
                          detail: 'Lumen maintenance, CRI ≥ 70, efficacy ≥ 135 lm/W',
                        },
                        {
                          code: 'IS/IEC 60529:2001',
                          title: 'Degrees of Protection Provided by Enclosures (IP66 Ingress Code)',
                          status: 'Current (Normative Reference)',
                          badge: 'Normative Ref',
                          badgeVariant: 'outline' as const,
                          detail: 'NABL accredited laboratory test certificate required',
                        },
                        {
                          code: 'IS 14700 (Part 3/Sec 2):2008',
                          title: 'Electromagnetic Compatibility (EMC): Limits for Harmonic Current (THD < 10%)',
                          status: 'Current (Normative Reference)',
                          badge: 'Normative Ref',
                          badgeVariant: 'outline' as const,
                          detail: 'Total Harmonic Distortion thresholds for public utility lines',
                        },
                      ].map((std, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-ink-200/70 p-3 transition-colors hover:bg-ivory-50/80"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-ink-900">{std.code}</span>
                              <Badge variant={std.badgeVariant} className="text-[10px] py-0 px-1.5">
                                {std.badge}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-ink-600 truncate">{std.title}</p>
                            <p className="text-[11px] text-ink-400">{std.detail}</p>
                          </div>
                          <div className="shrink-0 text-left sm:text-right">
                            <span className="inline-block rounded bg-ink-100/70 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                              {std.status}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Compact Why this applies reasoning fragment */}
                      <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-2.5 text-xs">
                        <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-teal-950 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Sparkles size={12} className="text-teal-700" />
                            Why IS 10322 (Part 5/Sec 3) Applies (Reasoning Fragment):
                          </span>
                          <span className="text-[10px] text-teal-800 bg-teal-100/70 px-1.5 py-0.5 rounded font-bold">
                            91% Applicability
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 text-[11px] font-mono text-ink-700">
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-teal-200/80 shadow-xs">
                            <CheckCircle2 size={11} className="text-teal-600 shrink-0" />
                            <span>Scope match</span>
                          </div>
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-teal-200/80 shadow-xs">
                            <CheckCircle2 size={11} className="text-teal-600 shrink-0" />
                            <span>Product match</span>
                          </div>
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-teal-200/80 shadow-xs">
                            <CheckCircle2 size={11} className="text-teal-600 shrink-0" />
                            <span>Param. compat.</span>
                          </div>
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-teal-200/80 shadow-xs">
                            <CheckCircle2 size={11} className="text-teal-600 shrink-0" />
                            <span>Current edition</span>
                          </div>
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-teal-200/80 shadow-xs col-span-2 sm:col-span-1">
                            <CheckCircle2 size={11} className="text-teal-600 shrink-0" />
                            <span>Evidence linked</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}



                  {heroActiveTab === 'issues' && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-error-200 bg-error-50/50 p-3.5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error-100 text-error-700">
                            <ShieldAlert size={13} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-xs font-semibold text-error-900">
                                Obsolete Standard Reference Detected
                              </h2>
                              <Badge variant="error" className="text-[10px]">High Severity</Badge>
                            </div>
                            <p className="mt-1 text-xs text-ink-700 leading-relaxed">
                              <strong>Tender Section 4.2</strong> cites withdrawn standard <code className="rounded bg-error-100 px-1 font-mono text-[11px] text-error-900">IS 1944:1981</code> (Code of practice for lighting of public thoroughfares).
                            </p>
                            <p className="mt-1.5 text-xs text-ink-500">
                              <strong>Defensible Recommendation:</strong> Update clause to cite current <code className="font-mono text-[11px]">IS 10322 (Part 5/Sec 3):2012</code> read with the National Lighting Code (SP 72:2010).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-warning-200 bg-warning-50/50 p-3.5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning-100 text-warning-700">
                            <ShieldAlert size={13} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-xs font-semibold text-warning-900">
                                Missing Mandatory 10kV Driver Surge Threshold
                              </h2>
                              <Badge variant="warning" className="text-[10px]">Specification Gap</Badge>
                            </div>
                            <p className="mt-1 text-xs text-ink-700 leading-relaxed">
                              <strong>Tender Section 3.2.4</strong> mentions "surge protection" without defining the numerical requirement. For outdoor public roadway luminaires, <code className="font-mono text-[11px]">IS 16107 (Part 2/Sec 1) Cl 10.3</code> mandates ≥ 10 kV internal surge protection.
                            </p>
                            <p className="mt-1.5 text-xs text-ink-500">
                              <strong>Recommendation:</strong> Specify explicit 10kV surge protection threshold with NABL test requirement to prevent premature driver failures.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-ink-200 bg-ivory-50/60 p-3.5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                            <FileCheck2 size={13} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-xs font-semibold text-ink-900">
                                Incomplete Ingress Protection Testing Evidence
                              </h2>
                              <Badge variant="neutral" className="text-[10px]">Evidence Gap</Badge>
                            </div>
                            <p className="mt-1 text-xs text-ink-700 leading-relaxed">
                              <strong>Tender Section 3.1.2</strong> requests IP66 rating but fails to require third-party NABL test reports per <code className="font-mono text-[11px]">IS/IEC 60529</code> with technical bids.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {heroActiveTab === 'profile' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-ink-200 p-4 bg-ivory-50/40">
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Procurement Entity & Context</p>
                        <dl className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-ink-100 pb-1.5">
                            <dt className="text-ink-500">Product</dt>
                            <dd className="font-medium text-ink-900 text-right">Commercial LED Street Lighting Luminaire</dd>
                          </div>
                          <div className="flex justify-between border-b border-ink-100 pb-1.5">
                            <dt className="text-ink-500">Application</dt>
                            <dd className="font-medium text-ink-900 text-right">Urban Arterial Roads & Public Highways</dd>
                          </div>
                          <div className="flex justify-between border-b border-ink-100 pb-1.5">
                            <dt className="text-ink-500">Operating Environment</dt>
                            <dd className="font-medium text-ink-900 text-right">Outdoor / -10°C to +50°C / IP66</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-ink-500">Procurement Stage</dt>
                            <dd className="font-medium text-ink-900 text-right">Pre-tender Specification Review</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-lg border border-ink-200 p-4 bg-ivory-50/40">
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Extracted Technical Parameters</p>
                        <dl className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-ink-100 pb-1.5">
                            <dt className="text-ink-500">Rated Wattage</dt>
                            <dd className="font-medium text-ink-900">90W to 120W (230V AC ± 10%)</dd>
                          </div>
                          <div className="flex justify-between border-b border-ink-100 pb-1.5">
                            <dt className="text-ink-500">Luminous Efficacy</dt>
                            <dd className="font-medium text-ink-900">≥ 135 Lumens/Watt</dd>
                          </div>
                          <div className="flex justify-between border-b border-ink-100 pb-1.5">
                            <dt className="text-ink-500">Correlated Color Temp (CCT)</dt>
                            <dd className="font-medium text-ink-900">4000K – 5000K (CRI ≥ 70)</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-ink-500">Harmonics & Surge</dt>
                            <dd className="font-medium text-ink-900">THD &lt; 10% · Surge ≥ 10 kV</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}

                  {heroActiveTab === 'evidence' && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-ink-200 bg-white p-4">
                        <div className="flex items-center justify-between border-b border-ink-100 pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-teal-700">NIT Clause 3.2.1 Citation</span>
                            <Badge variant="teal" className="text-[10px]">Verified 96% Match</Badge>
                          </div>
                          <span className="text-[11px] font-mono text-ink-400">Page 14 · MCD-2024-LT-09.pdf</span>
                        </div>
                        <blockquote className="border-l-2 border-teal-500 pl-3 text-xs italic text-ink-700 bg-ivory-50/70 py-1.5 rounded-r">
                          "The luminaire shall use high-power SMD LEDs with an integrated electronic driver operating at nominal 230V AC. Driver must offer thermal auto-cutoff and voltage cutoff."
                        </blockquote>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                          <div className="rounded bg-ivory-100/60 p-2 border border-ink-100">
                            <p className="font-semibold text-ink-800">Normative Standard Clause:</p>
                            <p className="text-ink-600 mt-0.5">IS 15885 (Part 2/Sec 13) Clause 8.1 — Thermal Endurance & Overload Protection</p>
                          </div>
                          <div className="rounded bg-ivory-100/60 p-2 border border-ink-100">
                            <p className="font-semibold text-ink-800">Regulatory Requirement:</p>
                            <p className="text-ink-600 mt-0.5">Mandatory Compulsory Registration Scheme (CRS) compliance under Electronics & IT Order</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Bottom bar in preview */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-ivory-50 px-4 py-2.5 sm:px-6 text-xs text-ink-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Clause-level evidence mapped to 7 applicable standards & 4 normative references
                </span>
                <button
                  onClick={() => navigate(isAuthenticated ? { name: 'analysis', analysisId: 'an-001' } : { name: 'signin', redirect: '/analysis/an-001' })}
                  className="font-medium text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
                >
                  Open full workspace analysis <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Defensibility Values Bar */}
      <section className="border-b border-ink-200 bg-white">
        <div className="container-page grid grid-cols-2 gap-px bg-ink-200 md:grid-cols-4">
          {[
            { title: 'Traceable evidence', desc: 'Every recommendation cited to specific document clauses & standard sections' },
            { title: 'Supersession Tracking', desc: 'Automatic validation of current editions, reaffirmed years & amendments' },
            { title: 'Normative Web Mapping', desc: 'Discovers companion standards, test methods & referenced codes' },
            { title: 'Auditable evidence record', desc: 'Complete exportable intelligence briefs for evaluation committees' },
          ].map((item, i) => (
            <div key={i} className="bg-white px-5 py-6">
              <h2 className="text-sm font-semibold text-ink-900">{item.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Procurement Workflow Section */}
      <section className="border-b border-ink-200 py-18 sm:py-24 bg-ivory-50">
        <div className="container-page">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="section-label mb-2">Workflow</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              From tender document to defensible procurement decision
            </h2>
            <p className="mt-3 text-base text-ink-600">
              The unified intelligence chain: <span className="font-mono font-medium text-teal-800">Requirement → Standard/Regulation → Evidence → Explanation</span>
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5 relative">
            {[
              {
                step: '01',
                title: 'Procurement input',
                desc: 'Upload tender documents, NITs, RFPs, BOQs, or technical specification schedules in PDF, DOCX, or XLSX.',
                icon: <FileText size={18} />,
              },
              {
                step: '02',
                title: 'Requirement understanding',
                desc: 'Extract scope, operating parameters, environmental constraints, and technical thresholds clause by clause.',
                icon: <FileSearch size={18} />,
              },
              {
                step: '03',
                title: 'Standards intelligence',
                desc: 'Discover applicable primary Indian Standards, active amendments, reaffirmed editions, and normative references.',
                icon: <Layers size={18} />,
              },
              {
                step: '04',
                title: 'Validation',
                desc: 'Detect obsolete references, missing safety thresholds, and mandatory regulatory/certification requirements.',
                icon: <ShieldCheck size={18} />,
              },
              {
                step: '05',
                title: 'Evidence-backed decision',
                desc: 'Generate traceable audit trails and defensible evaluation briefs linking conclusions to source evidence.',
                icon: <CheckCircle2 size={18} />,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card padding="md" className="h-full flex flex-col justify-between bg-white border-ink-200 hover:border-ink-300 hover:shadow-soft transition-all duration-200">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-semibold text-teal-700">{item.step}</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-ivory-100 text-ink-700">
                        {item.icon}
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-ink-900 mb-1.5">{item.title}</h3>
                    <p className="text-xs leading-relaxed text-ink-500">{item.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Polished Product Capabilities Sections (With Realistic UI Fragments) */}
      <section className="border-b border-ink-200 bg-white py-20 sm:py-28">
        <div className="container-page space-y-20 sm:space-y-28">
          {/* Capability 1: Standards & version intelligence */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid items-center gap-10 lg:grid-cols-12"
          >
            <div className="lg:col-span-5">
              <Badge variant="teal" className="mb-3">Capability 01</Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                Standards & version intelligence
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Never cite superseded standards or miss newly published amendments. StandIQ maps the full
                evolution of Indian Standards, tracking revisions, reaffirmation years, active amendments, and
                normative companion webs.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-ink-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                  <span>Automatic supersession checks (e.g. IS 2149 → IS 10322 Part 5/Sec 3)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                  <span>Tracks active Amendment 1 & 2 requirements and corrigenda</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                  <span>Normative companion mapping for drivers, EMC & photobiological safety</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7">
              {/* Realistic UI Fragment 1: Standards & Version Inspector */}
              <div className="rounded-xl border border-ink-200 bg-ivory-50/70 p-5 shadow-card hover:border-ink-300 transition-all duration-200">
                <div className="flex items-center justify-between border-b border-ink-200/80 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-ink-900 text-teal-400 font-mono text-xs font-bold">
                      IS
                    </div>
                    <div>
                      <h3 className="font-mono text-xs font-semibold text-ink-900">IS 10322 (Part 5/Sec 3):2012</h3>
                      <p className="text-[11px] text-ink-500">Luminaires: Particular Requirements - Road & Street Lighting</p>
                    </div>
                  </div>
                  <Badge variant="teal" className="text-[11px]">Current · Reaffirmed 2022</Badge>
                </div>

                <div className="space-y-3">
                  {/* Timeline */}
                  <div className="rounded-lg border border-ink-200 bg-white p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-2">Edition & Supersession History</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded bg-ivory-100 p-2">
                        <span className="block text-[10px] text-ink-400">1970 Edition</span>
                        <span className="font-mono font-medium text-ink-700">IS 2149:1970</span>
                        <span className="block text-[10px] text-error-600 mt-0.5">Withdrawn</span>
                      </div>
                      <div className="rounded bg-teal-50 border border-teal-200/60 p-2">
                        <span className="block text-[10px] text-teal-600 font-medium">2012 Revision</span>
                        <span className="font-mono font-semibold text-teal-900">IS 10322-5-3</span>
                        <span className="block text-[10px] text-teal-700 mt-0.5">Current Code</span>
                      </div>
                      <div className="rounded bg-ivory-100 p-2">
                        <span className="block text-[10px] text-ink-400">2022 Reaffirmation</span>
                        <span className="font-mono font-medium text-ink-700">Reaffirmed 2022</span>
                        <span className="block text-[10px] text-success-700 mt-0.5">Active Cycle</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Amendments */}
                  <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-white p-3 text-xs">
                    <div>
                      <span className="font-semibold text-ink-900">Active Amendments Applied:</span>
                      <span className="text-ink-600 ml-1.5">Amendment 1 (Nov 2018), Amendment 2 (Aug 2021)</span>
                    </div>
                    <Badge variant="neutral" className="text-[10px]">2 Amendments</Badge>
                  </div>

                  {/* Normative Companion Links */}
                  <div className="rounded-lg border border-ink-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-1.5">Normative Companions Linked</p>
                    <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                      <span className="rounded bg-ivory-100 px-2 py-0.5 text-ink-700 border border-ink-200/60">IS 15885-2-13 (Driver)</span>
                      <span className="rounded bg-ivory-100 px-2 py-0.5 text-ink-700 border border-ink-200/60">IS 16107-2-1 (Performance)</span>
                      <span className="rounded bg-ivory-100 px-2 py-0.5 text-ink-700 border border-ink-200/60">IS/IEC 60529 (IP66)</span>
                      <span className="rounded bg-ivory-100 px-2 py-0.5 text-ink-700 border border-ink-200/60">IS 14700-3-2 (EMC THD)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Capability 2: Specification quality & gap review */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid items-center gap-10 lg:grid-cols-12"
          >
            <div className="lg:col-span-7 order-2 lg:order-1">
              {/* Realistic UI Fragment 2: Specification Gap & Review Card */}
              <div className="rounded-xl border border-ink-200 bg-ivory-50/70 p-5 shadow-card hover:border-ink-300 transition-all duration-200">
                <div className="flex items-center justify-between border-b border-ink-200/80 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink-900">Specification Review #GAP-03</span>
                    <Badge variant="warning" className="text-[10px]">Medium Severity</Badge>
                  </div>
                  <span className="text-[11px] font-mono text-ink-500">Tender Section 3.2.4</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-error-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-error-700 text-[11px] uppercase tracking-wider">Original Tender Text (Deficient)</span>
                      <span className="text-[10px] text-error-600 font-mono">Under-specified</span>
                    </div>
                    <p className="italic text-ink-700 bg-error-50/40 p-2 rounded border border-error-100 font-mono text-[11px]">
                      "The luminaire driver shall be capable of withstanding voltage fluctuations and surges."
                    </p>
                    <p className="mt-2 text-ink-600 leading-relaxed">
                      <strong>Identified Issue:</strong> Clause lacks numerical voltage tolerance limits, surge immunity rating (kV), and total harmonic distortion (THD) threshold, leading to potential vendor disputes.
                    </p>
                  </div>

                  <div className="rounded-lg border border-success-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-success-700 text-[11px] uppercase tracking-wider">Recommended Defensible Clause</span>
                      <span className="text-[10px] text-success-700 font-mono">Standards-Aligned</span>
                    </div>
                    <p className="text-ink-800 bg-success-50/40 p-2 rounded border border-success-100 font-mono text-[11px] leading-relaxed">
                      "Driver shall operate continuously from 140V to 300V AC (50 Hz ± 3%), withstand 440V for 2 hours, incorporate internal surge protection ≥ 10 kV per IS 16107 (Part 2/Sec 1) Cl 10.3, and maintain THD &lt; 10% per IS 14700 (Part 3/Sec 2)."
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-500">
                      <CheckCircle2 size={13} className="text-success-600" />
                      <span>Directly resolves ambiguity & satisfies technical audit criteria</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2">
              <Badge variant="blue" className="mb-3">Capability 02</Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                Specification quality & gap detection
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Identify under-specified parameters, conflicting clauses, and missing safety thresholds before
                tenders are released. StandIQ translates standard requirements into concrete specification adjustments.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-ink-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                  <span>Pinpoints ambiguous terms ("standard durability", "normal fluctuations")</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                  <span>Provides defensible, standard-referenced clause replacements</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                  <span>Prevents bidder disqualification disputes and pre-bid friction</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Capability 3: Evidence & provenance */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid items-center gap-10 lg:grid-cols-12"
          >
            <div className="lg:col-span-5">
              <Badge variant="neutral" className="mb-3">Capability 03</Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                Evidence & provenance trail
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Every conclusion is tethered to verifiable evidence. StandIQ links your tender clauses directly
                to official standard paragraphs, laboratory testing mandates, and regulatory orders.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-ink-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                  <span>Exact clause-by-clause source document provenance</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                  <span>Specific standard clause references and test method numbers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                  <span>Immutable audit hashes for technical evaluation committee records</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7">
              {/* Realistic UI Fragment 3: Evidence & Provenance Inspector */}
              <div className="rounded-xl border border-ink-200 bg-ivory-50/70 p-5 shadow-card hover:border-ink-300 transition-all duration-200">
                <div className="flex items-center justify-between border-b border-ink-200/80 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink-900">Evidence Provenance #EVD-714</span>
                    <Badge variant="teal" className="text-[10px]">Verified Audit Link</Badge>
                  </div>
                  <span className="text-[11px] font-mono text-ink-500">Hash: 8a4f9...2c1</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Step 1: Tender snippet */}
                  <div className="rounded-lg border border-ink-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-ink-700 uppercase tracking-wider">Source Document Excerpt</span>
                      <span className="font-mono text-[10px] text-ink-400">NIT #MCD-2024-LT-09 · Page 12, §3.1.2</span>
                    </div>
                    <blockquote className="border-l-2 border-ink-400 pl-2.5 text-ink-800 italic bg-ivory-50 p-1.5 rounded-r font-mono text-[11px]">
                      "Luminaire housing shall be die-cast aluminum with minimum IP66 rating for outdoor highway operation."
                    </blockquote>
                  </div>

                  {/* Step 2: Linked Standard & Clause */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-ink-200 bg-white p-3">
                      <p className="text-[11px] font-semibold text-ink-700 uppercase tracking-wider mb-1">Standard Reference</p>
                      <p className="font-mono text-xs font-semibold text-teal-800">IS 10322 (Part 5/Sec 3)</p>
                      <p className="text-[11px] text-ink-600 mt-0.5">Clause 7.2: Ingress Protection for Roadway Luminaires</p>
                    </div>

                    <div className="rounded-lg border border-ink-200 bg-white p-3">
                      <p className="text-[11px] font-semibold text-ink-700 uppercase tracking-wider mb-1">Test Method & Standard</p>
                      <p className="font-mono text-xs font-semibold text-blue-800">IS/IEC 60529:2001</p>
                      <p className="text-[11px] text-ink-600 mt-0.5">Clause 13.4 & 14.2.6 (Dust-tight & High Pressure Water Jet)</p>
                    </div>
                  </div>

                  {/* Step 3: Audit trail note */}
                  <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-2.5 flex items-center justify-between text-[11px]">
                    <span className="text-teal-900 font-medium">Compliance Verification Requirement:</span>
                    <span className="text-teal-700">NABL Accredited Test Certificate mandated at bid submission</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Target Audience & Defensibility Value Section */}
      <section className="border-b border-ink-200 bg-ivory-50 py-18 sm:py-24">
        <div className="container-page">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="section-label mb-2">Defensibility</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Engineered for rigorous procurement governance
            </h2>
            <p className="mt-3 text-base text-ink-600">
              StandIQ provides technical evaluation committees with defensible intelligence that stands up to audits and vendor queries.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Technical Evaluation Committees',
                desc: 'Assess bidder compliance against exact standard clauses. Uncover whether offered products reference outdated test methods or missing certification schemes.',
                highlight: 'Defend technical scoring decisions',
              },
              {
                title: 'Procurement & Tender Authors',
                desc: 'Draft watertight specifications before publication. Ensure every referenced IS code is current, valid, and accompanied by normative companion requirements.',
                highlight: 'Eliminate post-tender corrigenda',
              },
              {
                title: 'Internal Audit & Compliance Officers',
                desc: 'Maintain complete provenance trails connecting public spending specifications to national standards, BIS guidelines, and quality control regulations.',
                highlight: 'Auditable evidence record',
              },
            ].map((role, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card padding="lg" className="bg-white border-ink-200 hover:border-ink-300 hover:shadow-soft transition-all duration-200 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-ink-900">{role.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-ink-600">{role.desc}</p>
                  </div>
                  <div className="mt-5 border-t border-ink-100 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                      <CheckCircle2 size={13} className="text-teal-600" />
                      {role.highlight}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Transform your tender specifications into defensible standards intelligence
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-600">
              Upload your tender documents to identify applicable Indian Standards, uncover version gaps,
              and generate defensible evidence trails in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => navigate(isAuthenticated ? { name: 'new-analysis' } : { name: 'signin', redirect: '/new-analysis' })}
                rightIcon={<ArrowRight size={17} />}
                className="shadow-card active:scale-[0.98] transition-transform"
              >
                Analyze a tender
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate({ name: 'standards' })}
                leftIcon={<Search size={16} />}
                className="active:scale-[0.98] transition-transform"
              >
                Explore Standards Directory
              </Button>
            </div>
            <p className="mt-4 text-xs text-ink-400">
              No complex setup required · Works with PDF, DOCX, and XLSX procurement files
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
