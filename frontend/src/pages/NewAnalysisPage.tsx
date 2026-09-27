import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  BookOpen, CheckCircle2,
  FileCheck2,
  FileText,
  FileUp,
  HelpCircle,
  Layers,
  ListPlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { TopNav } from '@/components/TopNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/router';
import { createAnalysis, waitForAnalysis, getSampleDocument, extractProfilePreview, getBackendHealth } from '@/services/api';
import { statusBadge } from '@/services/adapter';
import type { ProcurementProfile, ProfileParameter, ProfileFieldStatus } from '@/data/types';

// Realistic sample data for LED Street Lighting tender
const SAMPLE_TENDER_FILENAME = 'NIT_MCD_2024_LED_StreetLighting_Specs.pdf';

const SAMPLE_PASTED_SPEC = `TECHNICAL SPECIFICATION FOR 90W–120W LED STREET LIGHTING LUMINAIRES
1. SCOPE & APPLICATION:
Supply and installation of energy-efficient outdoor LED luminaires for urban arterial roads and public highways under Municipal Infrastructure Modernization Project.

2. OPERATING ENVIRONMENT & CONSTRUCTION:
- Ingress Protection: IP66 for optical and controlgear compartments.
- Housing: High pressure die-cast aluminum with anti-corrosion powder coating.
- Ambient Temperature Range: -10°C to +50°C.

3. ELECTRICAL & OPTICAL PARAMETERS:
- Rated Wattage: 90W to 120W, operating at 230V AC ± 10%, 50 Hz.
- System Efficacy: ≥ 135 lm/W.
- Correlated Color Temperature (CCT): 4000K – 5000K (Cool White / Neutral White).
- Color Rendering Index (CRI): Ra ≥ 70.
- Total Harmonic Distortion (THD): < 10% under full load.
- Internal Surge Protection: ≥ 10 kV internal surge protection device.
- Driver: Constant current with thermal overload cutoff and 440V over-voltage protection for 2 hours.

4. MANDATORY TESTING & CERTIFICATION:
- Third-party NABL accredited laboratory test report for IP66 rating per IS/IEC 60529.
- Photometric and lumen maintenance test report (L70 > 50,000 burning hours).
- Mandatory BIS Compulsory Registration Scheme (CRS) certification for LED driver and module under MeitY orders.
- Design compliance with National Lighting Code SP 72:2010.`;

const SAMPLE_DESCRIBED_TEXT = `We are floating a municipal tender for 90W to 120W commercial LED street lighting luminaires to be deployed on urban arterial roads and highways. Luminaires must have high efficacy (minimum 135 lm/W), IP66 outdoor weatherproofing, CCT between 4000K and 5000K, THD below 10%, and ≥ 10 kV driver surge immunity with thermal auto-cutoff. Bidders must submit NABL test reports for IP66 and proof of BIS CRS compulsory registration.`;

const HINDI_PROFILE: ProcurementProfile = {
  "product": "Air Conditioning Units (Split/Tower/Cassette)",
  "category": "HVAC Maintenance & Service",
  "application": "Comprehensive Annual Maintenance Contract (AMC) for 168 ACs",
  "environment": "Indoor / Commercial / Institutional (BRIC-NIBMG)",
  "technicalParameters": [
    {
      "id": "tp-1",
      "label": "Contract Scope",
      "value": "168 NOS A.C. Machines",
      "status": "detected",
      "sourceClause": "Scope of work"
    },
    {
      "id": "tp-2",
      "label": "Performance Guarantee",
      "value": "10% of Contract Value",
      "status": "detected",
      "sourceClause": "Sec 2"
    }
  ],
  "performanceRequirements": [
    {
      "id": "pr-1",
      "label": "Maintenance Schedule",
      "value": "Quarterly Routine Service & Preventive Maintenance",
      "status": "detected",
      "sourceClause": "Sec 1"
    },
    {
      "id": "pr-2",
      "label": "Financial Turnover",
      "value": "Minimum \u20b9 1.21 Lakhs in last 5 years",
      "status": "detected",
      "sourceClause": "Eligibility"
    },
    {
      "id": "pr-3",
      "label": "Experience",
      "value": "Minimum 5 years of similar work experience",
      "status": "detected",
      "sourceClause": "Eligibility"
    }
  ],
  "testingRequirements": [],
  "regulatoryMentions": [
    {
      "id": "rm-1",
      "label": "Integrity Pact",
      "value": "Mandatory submission for compliance",
      "status": "detected"
    },
    {
      "id": "rm-2",
      "label": "MSME Exemption",
      "value": "EMD Exemption under Rule 170 GFR",
      "status": "detected"
    }
  ]
};

const TAMIL_PROFILE: ProcurementProfile = {
  "product": "Air Conditioning Units (Split/Tower/Cassette)",
  "category": "HVAC Maintenance & Service",
  "application": "168 \u0b8f.\u0b9a\u0bbf. \u0b87\u0baf\u0ba8\u0bcd\u0ba4\u0bbf\u0bb0\u0b99\u0bcd\u0b95\u0bb3\u0bc1\u0b95\u0bcd\u0b95\u0bc1 1 (\u0b92\u0bb0\u0bc1) \u0b86\u0ba3\u0bcd\u0b9f\u0bbf\u0bb1\u0bcd\u0b95\u0bbe\u0ba9 \u0bae\u0bc1\u0bb4\u0bc1\u0bae\u0bc8\u0baf\u0bbe\u0ba9 \u0baa\u0bb0\u0bbe\u0bae\u0bb0\u0bbf\u0baa\u0bcd\u0baa\u0bc1 \u0b92\u0baa\u0bcd\u0baa\u0ba8\u0bcd\u0ba4\u0bae\u0bcd",
  "environment": "Indoor / Commercial / Institutional (BRIC-NIBMG)",
  "technicalParameters": [
    {
      "id": "tp-1",
      "label": "Contract Scope",
      "value": "168 NOS A.C. Machines",
      "status": "detected",
      "sourceClause": "Scope of work"
    },
    {
      "id": "tp-2",
      "label": "Performance Guarantee",
      "value": "\u0b92\u0baa\u0bcd\u0baa\u0ba8\u0bcd\u0ba4 \u0bae\u0ba4\u0bbf\u0baa\u0bcd\u0baa\u0bbf\u0bb2\u0bcd 10%",
      "status": "detected",
      "sourceClause": "Sec 2"
    }
  ],
  "performanceRequirements": [
    {
      "id": "pr-1",
      "label": "Maintenance Schedule",
      "value": "\u0b95\u0bbe\u0bb2\u0bbe\u0ba3\u0bcd\u0b9f\u0bc1 \u0bb5\u0bb4\u0b95\u0bcd\u0b95\u0bae\u0bbe\u0ba9 \u0b9a\u0bc7\u0bb5\u0bc8\u0b95\u0bb3\u0bcd",
      "status": "detected",
      "sourceClause": "Sec 1"
    },
    {
      "id": "pr-2",
      "label": "Financial Turnover",
      "value": "\u0b95\u0bc1\u0bb1\u0bc8\u0ba8\u0bcd\u0ba4\u0baa\u0b9f\u0bcd\u0b9a\u0bae\u0bcd \u20b9 1.21 \u0bb2\u0b9f\u0bcd\u0b9a\u0bae\u0bcd",
      "status": "detected",
      "sourceClause": "Eligibility"
    },
    {
      "id": "pr-3",
      "label": "Experience",
      "value": "\u0b95\u0bc1\u0bb1\u0bc8\u0ba8\u0bcd\u0ba4\u0baa\u0b9f\u0bcd\u0b9a\u0bae\u0bcd 5 \u0b86\u0ba3\u0bcd\u0b9f\u0bc1\u0b95\u0bb3\u0bcd",
      "status": "detected",
      "sourceClause": "Eligibility"
    }
  ],
  "testingRequirements": [],
  "regulatoryMentions": [
    {
      "id": "rm-1",
      "label": "Integrity Pact",
      "value": "Mandatory submission for compliance",
      "status": "detected"
    },
    {
      "id": "rm-2",
      "label": "MSME Exemption",
      "value": "EMD Exemption under Rule 170 GFR",
      "status": "detected"
    }
  ]
};

// Generic blank profile used when a real (non-fixture) input is submitted.
// All fields are empty/editable — the user fills or confirms before analysing.
const GENERIC_PROFILE: ProcurementProfile = {
  product: '',
  category: '',
  application: '',
  environment: '',
  technicalParameters: [],
  performanceRequirements: [],
  testingRequirements: [],
  regulatoryMentions: [],
};

const INITIAL_PROFILE: ProcurementProfile = {
  product: 'Commercial LED Street Lighting Luminaire',
  category: 'Outdoor Lighting & Electrical Infrastructure',
  application: 'Urban arterial roads and public highway lighting',
  environment: 'IP66 outdoor installation (-10°C to +50°C, high humidity)',
  technicalParameters: [
    { id: 'tp-1', label: 'Rated Power', value: '90W to 120W (230V AC ± 10%, 50 Hz)', originalValue: '90W to 120W (230V AC ± 10%, 50 Hz)', status: 'detected', sourceClause: 'Section 3.1' },
    { id: 'tp-2', label: 'System Efficacy', value: '≥ 135 Lumens / Watt', originalValue: '≥ 135 Lumens / Watt', status: 'detected', sourceClause: 'Section 3.2' },
    { id: 'tp-3', label: 'Color Temp (CCT)', value: '4000K – 5000K (Neutral / Cool White)', originalValue: '4000K – 5000K (Neutral / Cool White)', status: 'detected', sourceClause: 'Section 3.3' },
    { id: 'tp-4', label: 'Harmonic Distortion', value: 'THD < 10% at full load', originalValue: 'THD < 10% at full load', status: 'detected', sourceClause: 'Section 3.5' },
    { id: 'tp-5', label: 'Surge Protection', value: '≥ 10 kV internal SPD', originalValue: '≥ 10 kV internal SPD', status: 'detected', sourceClause: 'Section 3.6' },
  ],
  performanceRequirements: [
    { id: 'pr-1', label: 'Lumen Maintenance', value: 'L70 > 50,000 burning hours @ 25°C', originalValue: 'L70 > 50,000 burning hours @ 25°C', status: 'detected', sourceClause: 'Section 4.2' },
    { id: 'pr-2', label: 'Color Rendering', value: 'CRI (Ra) ≥ 70', originalValue: 'CRI (Ra) ≥ 70', status: 'detected', sourceClause: 'Section 3.4' },
    { id: 'pr-3', label: 'System Power Factor', value: '> 0.95 at rated operating voltage', originalValue: '> 0.95 at rated operating voltage', status: 'needs-review', sourceClause: 'Implicit requirement' },
    { id: 'pr-4', label: 'Driver Protection', value: 'Thermal auto-cutoff & 440V withstand (2 hrs)', originalValue: 'Thermal auto-cutoff & 440V withstand (2 hrs)', status: 'detected', sourceClause: 'Section 3.7' },
  ],
  testingRequirements: [
    { id: 'tr-1', label: 'Ingress Protection Test', value: 'IP66 test report from NABL-accredited laboratory (IS/IEC 60529)', originalValue: 'IP66 test report from NABL-accredited laboratory (IS/IEC 60529)', status: 'detected', sourceClause: 'Section 4.1' },
    { id: 'tr-2', label: 'Driver Safety & Endurance', value: 'Thermal endurance & safety testing per IS 15885-2-13', originalValue: 'Thermal endurance & safety testing per IS 15885-2-13', status: 'detected', sourceClause: 'Section 3.7' },
    { id: 'tr-3', label: 'Harmonic Emissions Test', value: 'EMC harmonics verification per IS 14700-3-2', originalValue: 'EMC harmonics verification per IS 14700-3-2', status: 'needs-review', sourceClause: 'Section 3.5' },
  ],
  regulatoryMentions: [
    { id: 'rm-1', label: 'BIS Compulsory Registration', value: 'CRS registration for electronic controlgear & LED module', originalValue: 'CRS registration for electronic controlgear & LED module', status: 'detected', sourceClause: 'Section 4.3' },
    { id: 'rm-2', label: 'Quality Control Order (QCO)', value: 'Applicable mandatory QCO for LED luminaires', originalValue: 'Applicable mandatory QCO for LED luminaires', status: 'detected', sourceClause: 'Section 4.3' },
    { id: 'rm-3', label: 'National Lighting Code', value: 'Code of practice SP 72:2010 for public roadway illumination', originalValue: 'Code of practice SP 72:2010 for public roadway illumination', status: 'detected', sourceClause: 'Section 4.4' },
  ],
};

type InputMode = 'upload' | 'paste' | 'describe';
type WorkflowStep = 'input' | 'extracting' | 'profile' | 'confirmed';

function ProfileFieldCard({ 
  item, 
  section,
  handleUpdateField, 
  handleRemoveField 
}: { 
  item: ProfileParameter, 
  section: 'technicalParameters' | 'performanceRequirements' | 'testingRequirements' | 'regulatoryMentions',
  handleUpdateField: (section: any, id: string, key: any, val: string) => void,
  handleRemoveField: (section: any, id: string) => void 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const renderStatusBadge = (status: ProfileFieldStatus) => {
    switch (status) {
      case 'detected':
        return <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 tracking-wide"><div className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Detected</span>;
      case 'edited':
        return <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 tracking-wide"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Manually Added</span>;
      case 'needs-review':
        return <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 tracking-wide border border-amber-200"><ShieldAlert size={10} /> Needs Review</span>;
      case 'not-found':
        return <span className="inline-flex items-center gap-1 rounded bg-error-50 px-2 py-0.5 text-[10px] font-semibold text-error-700 tracking-wide"><div className="w-1.5 h-1.5 rounded-full bg-error-500" /> Not found in text</span>;
    }
  };



  return (
    <div className="rounded-lg border border-ink-100 bg-white overflow-hidden shadow-xs hover:border-ink-200 transition-colors">
      <div className="p-4 space-y-3">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={item.label}
              onChange={(e) => handleUpdateField(section, item.id, 'label', e.target.value)}
              className="w-full font-bold text-ink-800 uppercase tracking-wider font-sans text-[10px] bg-ivory-50 border border-ink-200 px-2 py-1 rounded focus:outline-none focus:border-teal-500"
              placeholder="Label"
            />
            <textarea
              value={item.value}
              onChange={(e) => handleUpdateField(section, item.id, 'value', e.target.value)}
              className="w-full font-mono text-sm font-semibold text-ink-900 bg-ivory-50 border border-ink-200 px-2 py-1 rounded focus:outline-none focus:border-teal-500 resize-y min-h-[80px]"
              placeholder="Value"
            />
          </div>
        ) : (
          <div>
            <h4 className="text-[10px] font-bold text-ink-500 uppercase tracking-wider font-sans mb-1">
              {item.label}
            </h4>
            <p className="font-mono text-[13px] font-semibold text-ink-900 line-clamp-3">
              {item.value}
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {renderStatusBadge(item.status)}
          {item.status === 'needs-review' && (
            <span className="text-[10px] text-amber-800 bg-amber-50/50 px-2 py-0.5 rounded">Reason: Ambiguous extraction; implied but not explicitly stated in text.</span>
          )}
        </div>

        {showEvidence && (
          <div className="mt-3 bg-ivory-50 rounded-lg p-3 border border-ink-100 text-xs">
            <div className="flex items-center gap-1.5 text-ink-400 font-semibold tracking-wider uppercase text-[10px] mb-2">
              <BookOpen size={11} /> Source: {item.sourceClause || 'Extracted from text'}
            </div>
            <p className="text-ink-700 italic border-l-2 border-teal-200 pl-3 py-0.5 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
              "{item.originalValue || item.value}"
            </p>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between px-4 py-2 bg-ivory-50/50 border-t border-ink-100 text-[11px] font-medium">
        <div className="flex items-center gap-4 text-teal-800">
          <button 
            onClick={() => setShowEvidence(!showEvidence)}
            className="hover:text-teal-900 font-semibold"
          >
            {showEvidence ? 'Hide Evidence' : 'View Evidence'}
          </button>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 hover:text-teal-900 font-semibold"
          >
            {isEditing ? <Check size={12} /> : <Pencil size={12} />} 
            {isEditing ? 'Done' : 'Edit'}
          </button>
          
          {item.status === 'needs-review' && (
             <button
               onClick={() => handleUpdateField(section, item.id, 'status', 'detected')}
               className="flex items-center gap-1 ml-2 bg-success-50 text-success-800 border border-success-200 px-2 py-0.5 rounded-full hover:bg-success-100 transition-colors"
             >
               <Check size={12} /> Confirm
             </button>
          )}
        </div>
        <button 
          onClick={() => handleRemoveField(section, item.id)}
          className="text-error-700 hover:text-error-800 font-semibold"
        >
          Exclude
        </button>
      </div>
    </div>
  );
}

// A failed analysis carries the backend's error_message, which names the stage
// that failed (e.g. "[NO_EXTRACTED_TEXT] …"). Show it for diagnosis, but never
// anything internal: no tracebacks, filesystem paths, URLs or key-like tokens.
function describeServerFailure(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let msg = raw.trim();
  if (!msg || /traceback|File "/i.test(msg)) return null;
  msg = msg
    .replace(/https?:\/\/[^\s)'"]+/g, '[url]')
    .replace(/(?:[A-Za-z]:)?(?:[\\/][\w-]+(?:\.[\w-]+)*){3,}[\\/]?/g, '[path]')
    .replace(/\b(?:sk|pk|AIza)[\w-]{8,}/g, '[redacted]');
  return msg.length > 240 ? `${msg.slice(0, 240)}…` : msg;
}

export function NewAnalysisPage() {
  const { navigate } = useRouter();

  // Backend readiness for cold starts
  const [isBackendReady, setIsBackendReady] = useState(false);
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        await getBackendHealth();
        if (mounted) {
          setIsBackendReady(true);
          // Stop polling — backend is up, no need to keep checking
          if (healthIntervalRef.current !== null) {
            clearInterval(healthIntervalRef.current);
            healthIntervalRef.current = null;
          }
        }
      } catch (e) {
        // Will retry on next interval tick
      }
    };
    check();
    healthIntervalRef.current = setInterval(check, 5000);
    return () => {
      mounted = false;
      if (healthIntervalRef.current !== null) {
        clearInterval(healthIntervalRef.current);
      }
    };
  }, []);

  // Workflow state
  const [step, setStep] = useState<WorkflowStep>('input');
  const [inputMode, setInputMode] = useState<InputMode>('upload');

  // Input fields
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; pages: number }[]>([]);
  const [pastedSpec, setPastedSpec] = useState('');
  const [describedText, setDescribedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  // Profile data
  const [profile, setProfile] = useState<ProcurementProfile>(INITIAL_PROFILE);
  // Tracks which presentation fixture was EXPLICITLY loaded via the sample button.
  // null means the user is submitting real input — never inferred from keywords.
  const [demoFixture, setDemoFixture] = useState<'led' | 'tamil' | 'hindi' | null>(null);
  const [addingSection, setAddingSection] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [newFieldStatus, setNewFieldStatus] = useState<ProfileFieldStatus>('detected');

  // Extraction animation step
  const [extractionProgress, setExtractionProgress] = useState(0);

  // Real backend submission state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileObjects, setUploadedFileObjects] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusLabel, setSubmitStatusLabel] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

  const addFiles = (picked: File[]) => {
    if (picked.length === 0) return;
    setUploadedFileObjects((prev) => [...prev, ...picked]);
    setUploadedFiles((prev) => [...prev, ...picked.map((f) => ({ name: f.name, size: formatSize(f.size), pages: 0 }))]);

    // Reset fixture first — uploading any file after the demo button was clicked
    // must not inherit the demo fixture.
    setDemoFixture(null);
  };

  const removeFileAt = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
    setUploadedFileObjects((prev) => prev.filter((_, i) => i !== idx));
    // If the user removes ALL files, there's nothing to run a fixture for.
    // Reset so the next upload or submit gets real analysis.
    setDemoFixture(null);
  };

  // Load sample data helper — fetches the real bundled tender PDF for upload mode
  const handleLoadSample = async () => {
    setAnalysisTitle('Municipal LED Street Lighting — Arterial Roads NIT #MCD-2024-LT-09');
    setDemoFixture('led');
    if (inputMode === 'upload') {
      try {
        const file = await getSampleDocument();
        setUploadedFileObjects([file]);
        setUploadedFiles([{ name: file.name, size: formatSize(file.size), pages: 18 }]);
      } catch {
        // Sample endpoint unavailable (backend cold/offline) — keep metadata; submit falls back to sample text
        setUploadedFileObjects([]);
        setUploadedFiles([{ name: SAMPLE_TENDER_FILENAME, size: '2.8 MB', pages: 18 }]);
      }
    } else if (inputMode === 'paste') {
      setPastedSpec(SAMPLE_PASTED_SPEC);
    } else {
      setDescribedText(SAMPLE_DESCRIBED_TEXT);
    }
  };

  // Confirm & run the real analysis on the live backend, then open the real result
  const handleConfirmAndAnalyze = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitStatusLabel('Waking the analysis service (first run can take ~50s)…');
    try {
      let file: File | undefined = (inputMode === 'upload' && uploadedFileObjects[0]) ? uploadedFileObjects[0] : undefined;

      let text: string | undefined;
      // We already declared `file` above for the mock check, but we need to reassign it
      // based on documentId logic.
      if (inputMode === 'upload' && uploadedFileObjects[0]) {
        if (!documentId) {
          file = uploadedFileObjects[0];
        } else {
          file = undefined;
        }
      } else if (inputMode === 'paste' && pastedSpec.trim()) {
        text = pastedSpec.trim();
      } else if (inputMode === 'describe' && describedText.trim()) {
        text = describedText.trim();
      } else {
        // Upload mode without a captured File (sample fetch failed) — submit the sample spec text
        text = SAMPLE_PASTED_SPEC;
      }

      const created = await createAnalysis({
        text,
        file,
        document_id: documentId,
        category: profile.category,
        department: 'Procurement',
        tenderTitle: analysisTitle.trim() || 'Untitled procurement analysis',
      });
      const analysisId = created.analysis_id;
      setSubmitStatusLabel('Queued…');

      if (demoFixture === 'led') {
        // Staged animation — ~13s total to feel thorough but not sluggish
        await new Promise(r => setTimeout(r, 1500));
        setSubmitStatusLabel('Extracting requirements...');
        await new Promise(r => setTimeout(r, 3500));
        setSubmitStatusLabel('Matching against BIS directory...');
        await new Promise(r => setTimeout(r, 4000));
        setSubmitStatusLabel('Finding regulatory gaps...');
        await new Promise(r => setTimeout(r, 4000));
        setSubmitStatusLabel('Finalizing compliance report...');
      }

      const final = await waitForAnalysis(
        analysisId,
        (a: any) => {
          if (demoFixture !== 'led') {
            setSubmitStatusLabel(`${statusBadge(a?.status).label}…`);
          }
        },
        120000
      );

      if (final.status === 'failed') {
        const detail = describeServerFailure(final.error_message);
        setSubmitError(
          detail
            ? `The analysis service could not process this input. Server reported: ${detail}`
            : 'The analysis service could not process this input. Try clearer specification text or a different document.',
        );
        setIsSubmitting(false);
        return;
      }
      navigate({ name: 'analysis', analysisId, tab: 'overview' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not reach the analysis service. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Trigger profile extraction
  const handleStartExtraction = async () => {
    setStep('extracting');
    setExtractionProgress(1);
    setSubmitError(null);

    // Note: Hindi and Tamil fixtures (an-hindi / an-tamil) only kick in AFTER
    // the user confirms — see handleConfirmAndAnalyze. The profile preview step
    // always runs live so the officer sees what was actually extracted from their
    // document, including any IS references in the Hindi/bilingual text.

    // Live extraction path — every real input, including the bundled sample.
    try {
      let text = '';
      let file: File | undefined = undefined;

      if (inputMode === 'upload' && uploadedFileObjects[0]) {
        file = uploadedFileObjects[0];
      } else if (inputMode === 'paste' && pastedSpec.trim()) {
        text = pastedSpec.trim();
      } else if (inputMode === 'describe' && describedText.trim()) {
        text = describedText.trim();
      } else if (demoFixture === 'led') {
        // Sample chosen but the PDF fetch failed (backend cold). Send the sample
        // spec text so the profile is still extracted from real text rather than
        // substituted with a canned one.
        text = SAMPLE_PASTED_SPEC;
      } else {
        setSubmitError('Add a document, paste a specification, or describe the requirement first.');
        setStep('input');
        return;
      }

      // Animate steps concurrently with the API call
      setTimeout(() => setExtractionProgress(2), 1000);
      setTimeout(() => setExtractionProgress(3), 2500);

      let res;
      res = await extractProfilePreview({ text, file, category: profile.category });
      
      // Preserve the original text for the evidence block so it stays intact even if user edits the value
      const populateOriginals = (items: ProfileParameter[]) => items?.map(i => ({ ...i, originalValue: i.value })) || [];
      res.technicalParameters = populateOriginals(res.technicalParameters);
      res.performanceRequirements = populateOriginals(res.performanceRequirements);
      res.testingRequirements = populateOriginals(res.testingRequirements);
      res.regulatoryMentions = populateOriginals(res.regulatoryMentions);
      
      setProfile(res);
      if (res.document_id) {
        setDocumentId(res.document_id);
      }
      setExtractionProgress(4);
      setTimeout(() => setStep('profile'), 500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not extract profile. Please try again.');
      setStep('input');
    }
  };

  // Profile field handlers
  const handleUpdateField = (
    section: 'technicalParameters' | 'performanceRequirements' | 'testingRequirements' | 'regulatoryMentions',
    id: string,
    key: 'label' | 'value' | 'status',
    val: string
  ) => {
    setProfile((prev) => ({
      ...prev,
      [section]: prev[section].map((item) =>
        item.id === id ? { ...item, [key]: val } : item
      ),
    }));
  };

  const handleRemoveField = (
    section: 'technicalParameters' | 'performanceRequirements' | 'testingRequirements' | 'regulatoryMentions',
    id: string
  ) => {
    setProfile((prev) => ({
      ...prev,
      [section]: prev[section].filter((item) => item.id !== id),
    }));
  };

  const handleAddField = (section: 'technicalParameters' | 'performanceRequirements' | 'testingRequirements' | 'regulatoryMentions') => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) return;

    const newItem: ProfileParameter = {
      id: `${section}-${Date.now()}`,
      label: newFieldLabel.trim(),
      value: newFieldValue.trim(),
      status: newFieldStatus,
      sourceClause: 'Manual entry',
    };

    setProfile((prev) => ({
      ...prev,
      [section]: [...prev[section], newItem],
    }));

    setNewFieldLabel('');
    setNewFieldValue('');
    setAddingSection(null);
  };

  // Check if input is ready
  const isInputValid =
    (inputMode === 'upload' && uploadedFiles.length > 0) ||
    (inputMode === 'paste' && pastedSpec.trim().length > 30) ||
    (inputMode === 'describe' && describedText.trim().length > 20);

  // Profile summary metrics
  const totalParams = profile.technicalParameters.length;
  const totalPerf = profile.performanceRequirements.length;
  const totalTesting = profile.testingRequirements.length;
  const totalRegulatory = profile.regulatoryMentions.length;
  const totalRequirements = totalParams + totalPerf + totalTesting + totalRegulatory;

  // Render status badge helper
  const renderStatusBadge = (status: ProfileFieldStatus) => {
    switch (status) {
      case 'detected':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200/80 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800">
            <span className="h-1 w-1 rounded-full bg-teal-500" />
            Detected
          </span>
        );
      case 'edited':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 border border-blue-200/80 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800">
            <span className="h-1 w-1 rounded-full bg-blue-500" />
            Edited
          </span>
        );
      case 'needs-review':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 border border-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Needs review
          </span>
        );
      case 'not-found':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600 border border-ink-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            <span className="h-1 w-1 rounded-full bg-ink-400" />
            Not found
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50 text-ink-900 selection:bg-teal-500/20 dark:bg-[#090D16] dark:text-slate-100">
      <TopNav variant="app" />


      <main className="container-app py-8 max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 'profile') {
                setStep('input');
              } else {
                navigate({ name: 'workspace' });
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900"
          >
            <ArrowLeft size={14} />
            {step === 'profile' ? 'Change Input Source' : 'Back to Workspace'}
          </button>

          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${step === 'input' ? 'bg-teal-500' : 'bg-success-500'}`} />
            <span className="font-mono text-xs text-ink-500">
              {step === 'input' && 'Step 1 of 2: Procurement Intake'}
              {step === 'extracting' && 'Extracting Requirements…'}
              {step === 'profile' && 'Step 2 of 2: Detected Profile'}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: INPUT MODE                                            */}
        {/* ------------------------------------------------------------- */}
        {step === 'input' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 border border-teal-200/60 mb-3">
                <Sparkles size={12} className="text-teal-600" />
                Intelligent Procurement Intake
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                Start a procurement analysis
              </h1>
              <p className="mt-1.5 text-sm text-ink-600">
                Upload a tender, paste a specification, or describe what you are procuring.
              </p>
            </div>

            {/* Analysis Title Input */}
            <Card padding="md" className="mb-6 bg-white border-ink-200 shadow-soft">
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Analysis Reference Title
              </label>
              <input
                type="text"
                value={analysisTitle}
                onChange={(e) => setAnalysisTitle(e.target.value)}
                placeholder="e.g. Smart City Infrastructure · Municipal LED Street Lighting NIT"
                className="input text-sm font-medium"
              />
            </Card>

            {/* Input Mode Selector */}
            <div className="mb-6">
              <div className="flex border-b border-ink-200 bg-white rounded-t-lg px-2 pt-2 gap-1 border-x border-t">
                {[
                  { id: 'upload', label: 'Upload Tender', icon: <FileUp size={14} />, hint: 'PDF, DOCX, TXT' },
                  { id: 'paste', label: 'Paste Specification', icon: <FileText size={14} />, hint: 'Raw technical clauses' },
                  { id: 'describe', label: 'Describe Requirement', icon: <Sparkles size={14} />, hint: 'Natural language' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setInputMode(tab.id as InputMode)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all ${
                      inputMode === tab.id
                        ? 'text-ink-900 font-semibold'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {inputMode === tab.id && (
                      <motion.div
                        layoutId="inputTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-900"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Mode 1: Upload Tender */}
              {inputMode === 'upload' && (
                <div className="rounded-b-lg border-b border-x border-ink-200 bg-white p-6 shadow-soft">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      addFiles(Array.from(e.dataTransfer.files || []));
                    }}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                      isDragOver
                        ? 'border-teal-500 bg-teal-50/40'
                        : 'border-ink-200 bg-ivory-50/60 hover:border-ink-300 hover:bg-ivory-50'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-ink-500 shadow-soft mb-3 border border-ink-200">
                      <Upload size={18} />
                    </div>
                    <p className="text-sm font-semibold text-ink-900">
                      Drop your tender or technical specification document here
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Supports PDF, DOCX, and TXT files up to 50 MB
                    </p>
                    <div className="mt-4 flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          addFiles(Array.from(e.target.files || []));
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Browse Files
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadSample}
                        className="btn-ghost text-xs text-teal-700 hover:bg-teal-50 py-1.5 px-3 font-medium"
                      >
                        Load LED Street-Lighting Example
                      </button>
                    </div>
                  </div>

                  {/* Uploaded File List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Attached Documents</p>
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-ink-200 bg-ivory-50/70 px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white text-teal-700 border border-ink-200">
                              <FileText size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-semibold text-ink-900 truncate">{file.name}</p>
                              <p className="text-[11px] text-ink-400">
                                {file.size}{file.pages > 0 ? ` · ${file.pages} pages extracted` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFileAt(idx)}
                            className="text-ink-400 hover:text-error-600 p-1"
                            aria-label="Remove file"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Paste Specification */}
              {inputMode === 'paste' && (
                <div className="rounded-b-lg border-b border-x border-ink-200 bg-white p-6 shadow-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">
                      Technical Specification Text
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="text-xs text-teal-700 hover:text-teal-900 font-medium"
                    >
                      Load LED street-lighting sample text
                    </button>
                  </div>
                  <textarea
                    rows={10}
                    value={pastedSpec}
                    onChange={(e) => { setPastedSpec(e.target.value); setDemoFixture(null); }}
                    placeholder="Paste tender specifications, BOQ clauses, scope of work, and performance requirements here…"
                    className="input font-mono text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-ink-400">
                    Tip: ManakSetu parses technical parameters, environmental constraints, and compliance mandates automatically.
                  </p>
                </div>
              )}

              {/* Mode 3: Describe Requirement */}
              {inputMode === 'describe' && (
                <div className="rounded-b-lg border-b border-x border-ink-200 bg-white p-6 shadow-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">
                      Natural Language Procurement Description
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="text-xs text-teal-700 hover:text-teal-900 font-medium"
                    >
                      Load LED street-lighting description
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={describedText}
                    onChange={(e) => { setDescribedText(e.target.value); setDemoFixture(null); }}
                    placeholder="Describe what product or work you are procuring, intended operating environment, key ratings, and any specific standards or certifications you require…"
                    className="input text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-ink-400">
                    ManakSetu extracts the product entity, electrical/mechanical parameters, and testing prerequisites from your description.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between border-t border-ink-200 bg-white rounded-lg p-4 shadow-soft">
              <div className="text-xs text-ink-500">
                {submitError ? (
                  <span className="text-error-600 font-medium">{submitError}</span>
                ) : isInputValid ? (
                  <span className="text-success-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    Input ready for profile extraction
                  </span>
                ) : (
                  <span>Attach a file, paste specification text, or load the LED sample to proceed</span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleStartExtraction}
                  disabled={!isInputValid || !isBackendReady}
                  rightIcon={<ArrowRight size={15} />}
                  className="shadow-soft active:scale-[0.98] transition-transform"
                >
                  {!isBackendReady ? 'Waking Backend (~50s)...' : 'Extract Procurement Profile'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* EXTRACTION SIMULATION STATE                                    */}
        {/* ------------------------------------------------------------- */}
        {step === 'extracting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="py-12"
          >
            <Card padding="lg" className="mx-auto max-w-lg bg-white border-ink-200 shadow-pop text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <RefreshCw size={22} className="animate-spin text-teal-600" />
              </div>
              <h2 className="text-lg font-semibold text-ink-900">Understanding Procurement Requirements</h2>
              <p className="mt-1 text-xs text-ink-500 max-w-sm mx-auto">
                Analyzing specification text, isolating physical parameters, and structuring candidate profile…
              </p>

              <div className="mt-6 space-y-2.5 text-left border-t border-ink-100 pt-4">
                {[
                  { step: 1, text: 'Parsing document structure and technical clauses' },
                  { step: 2, text: 'Extracting product entity, operating environment & ratings' },
                  { step: 3, text: 'Isolating testing requirements & certification mandates' },
                  { step: 4, text: 'Synthesizing structured procurement profile' },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-2.5 text-xs">
                    {extractionProgress >= item.step ? (
                      <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-ink-300 shrink-0" />
                    )}
                    <span className={extractionProgress >= item.step ? 'text-ink-800 font-medium' : 'text-ink-400'}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2: DETECTED PROCUREMENT PROFILE                           */}
        {/* ------------------------------------------------------------- */}
        {step === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Header & Principle Banner */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 border border-teal-200/60">
                  <Sparkles size={12} className="text-teal-600" />
                  Detected Procurement Profile
                </div>
                <span className="text-xs text-ink-500 font-mono">
                  {totalRequirements} candidate requirements extracted
                </span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
                Review & Refine Procurement Profile
              </h1>
              <p className="mt-1 text-xs text-ink-500 leading-relaxed">
                Detected from source. Review, edit, or append candidate requirements below before discovering applicable Indian Standards.
              </p>
            </div>

            {/* Principle Note: Extraction is not authoritative */}
            <div className="flex items-start gap-3 rounded-lg border border-teal-200/80 bg-teal-50/40 p-3.5 text-xs text-ink-700">
              <HelpCircle size={16} className="text-teal-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-teal-900">Review detected requirements before continuing:</span>
                <span className="text-ink-600 ml-1">
                  ManakSetu structures parameters extracted from your input. You can modify any value, add missing thresholds, or adjust criteria to guide accurate standards matching.
                </span>
              </div>
            </div>

            {/* Section 1: Core Entity & Operational Context */}
            <Card padding="md" className="bg-white border-ink-200 shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4">
                <h2 className="text-xs font-semibold text-ink-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} className="text-teal-700" />
                  Core Procurement Scope & Context
                </h2>
                <span className="text-[11px] text-ink-400 font-mono">4 core fields</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label text-xs">Product Entity</label>
                  <input
                    type="text"
                    value={profile.product}
                    onChange={(e) => setProfile({ ...profile, product: e.target.value })}
                    className="input text-xs font-medium"
                  />
                  <span className="mt-1 inline-block text-[10px] text-ink-400 font-mono">Target equipment / luminaire</span>
                </div>

                <div>
                  <label className="label text-xs">Procurement Category</label>
                  <input
                    type="text"
                    value={profile.category}
                    onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                    className="input text-xs font-medium"
                  />
                  <span className="mt-1 inline-block text-[10px] text-ink-400 font-mono">Infrastructure classification</span>
                </div>

                <div>
                  <label className="label text-xs">Application Context</label>
                  <input
                    type="text"
                    value={profile.application}
                    onChange={(e) => setProfile({ ...profile, application: e.target.value })}
                    className="input text-xs font-medium"
                  />
                  <span className="mt-1 inline-block text-[10px] text-ink-400 font-mono">Operating usage / roadway type</span>
                </div>

                <div>
                  <label className="label text-xs">Operating Environment</label>
                  <input
                    type="text"
                    value={profile.environment}
                    onChange={(e) => setProfile({ ...profile, environment: e.target.value })}
                    className="input text-xs font-medium"
                  />
                  <span className="mt-1 inline-block text-[10px] text-ink-400 font-mono">Ingress, thermal & ambient constraints</span>
                </div>
              </div>
            </Card>

            {/* Section 2: Technical Parameters */}
            <Card padding="md" className="bg-white border-ink-200 shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4">
                <div>
                  <h2 className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
                    Technical Parameters
                  </h2>
                  <p className="text-[11px] text-ink-500">Electrical, optical, and physical specifications</p>
                </div>
                <button
                  onClick={() => {
                    setAddingSection('technicalParameters');
                    setNewFieldLabel('');
                    setNewFieldValue('');
                  }}
                  className="btn-ghost text-xs py-1 px-2.5 text-teal-700 hover:bg-teal-50 font-medium inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  Add Parameter
                </button>
              </div>

              <div className="space-y-2">
                {profile.technicalParameters.map((item) => (
                  <ProfileFieldCard
                    key={item.id}
                    item={item}
                    section="technicalParameters"
                    handleUpdateField={handleUpdateField}
                    handleRemoveField={handleRemoveField}
                  />
                ))}
              </div>

              {/* Inline Add Field Drawer */}
              {addingSection === 'technicalParameters' && (
                <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3 text-xs space-y-2 animate-in">
                  <p className="font-semibold text-teal-900 text-[11px]">Add New Technical Parameter</p>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      placeholder="Parameter name (e.g. Surge Immunity)"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      className="input text-xs"
                      autoFocus
                    />
                    <input
                      placeholder="Value / threshold (e.g. ≥ 10 kV)"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      className="input text-xs sm:col-span-2"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setAddingSection(null)}
                      className="btn-ghost text-xs py-1 px-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddField('technicalParameters')}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Save Parameter
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Section 3: Performance Requirements */}
            <Card padding="md" className="bg-white border-ink-200 shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4">
                <div>
                  <h2 className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
                    Performance Requirements
                  </h2>
                  <p className="text-[11px] text-ink-500">Durability, luminous flux maintenance, and driver endurance</p>
                </div>
                <button
                  onClick={() => {
                    setAddingSection('performanceRequirements');
                    setNewFieldLabel('');
                    setNewFieldValue('');
                  }}
                  className="btn-ghost text-xs py-1 px-2.5 text-teal-700 hover:bg-teal-50 font-medium inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  Add Requirement
                </button>
              </div>

              <div className="space-y-2">
                {profile.performanceRequirements.map((item) => (
                  <ProfileFieldCard
                    key={item.id}
                    item={item}
                    section="performanceRequirements"
                    handleUpdateField={handleUpdateField}
                    handleRemoveField={handleRemoveField}
                  />
                ))}
              </div>

              {/* Inline Add Field Drawer */}
              {addingSection === 'performanceRequirements' && (
                <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3 text-xs space-y-2 animate-in">
                  <p className="font-semibold text-teal-900 text-[11px]">Add New Performance Requirement</p>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      placeholder="Requirement name"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      className="input text-xs"
                      autoFocus
                    />
                    <input
                      placeholder="Performance specification"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      className="input text-xs sm:col-span-2"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setAddingSection(null)}
                      className="btn-ghost text-xs py-1 px-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddField('performanceRequirements')}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Save Requirement
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Section 4: Testing & Laboratory Requirements */}
            <Card padding="md" className="bg-white border-ink-200 shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4">
                <div>
                  <h2 className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
                    Testing & Laboratory Requirements
                  </h2>
                  <p className="text-[11px] text-ink-500">Type test reports, NABL accreditations, and test methods</p>
                </div>
                <button
                  onClick={() => {
                    setAddingSection('testingRequirements');
                    setNewFieldLabel('');
                    setNewFieldValue('');
                  }}
                  className="btn-ghost text-xs py-1 px-2.5 text-teal-700 hover:bg-teal-50 font-medium inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  Add Test
                </button>
              </div>

              <div className="space-y-2">
                {profile.testingRequirements.map((item) => (
                  <ProfileFieldCard
                    key={item.id}
                    item={item}
                    section="testingRequirements"
                    handleUpdateField={handleUpdateField}
                    handleRemoveField={handleRemoveField}
                  />
                ))}
              </div>

              {/* Inline Add Field Drawer */}
              {addingSection === 'testingRequirements' && (
                <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3 text-xs space-y-2 animate-in">
                  <p className="font-semibold text-teal-900 text-[11px]">Add New Testing Requirement</p>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      placeholder="Test name (e.g. Ingress Protection)"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      className="input text-xs"
                      autoFocus
                    />
                    <input
                      placeholder="Standard test specification / lab requirement"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      className="input text-xs sm:col-span-2"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setAddingSection(null)}
                      className="btn-ghost text-xs py-1 px-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddField('testingRequirements')}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Save Test
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Section 5: Certification & Regulatory Mentions */}
            <Card padding="md" className="bg-white border-ink-200 shadow-soft">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4">
                <div>
                  <h2 className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
                    Certification & Regulatory Mentions
                  </h2>
                  <p className="text-[11px] text-ink-500">BIS Compulsory Registration, QCO orders, and statutory codes</p>
                </div>
                <button
                  onClick={() => {
                    setAddingSection('regulatoryMentions');
                    setNewFieldLabel('');
                    setNewFieldValue('');
                  }}
                  className="btn-ghost text-xs py-1 px-2.5 text-teal-700 hover:bg-teal-50 font-medium inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  Add Regulatory Mention
                </button>
              </div>

              <div className="space-y-2">
                {profile.regulatoryMentions.map((item) => (
                  <ProfileFieldCard
                    key={item.id}
                    item={item}
                    section="regulatoryMentions"
                    handleUpdateField={handleUpdateField}
                    handleRemoveField={handleRemoveField}
                  />
                ))}
              </div>

              {/* Inline Add Field Drawer */}
              {addingSection === 'regulatoryMentions' && (
                <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3 text-xs space-y-2 animate-in">
                  <p className="font-semibold text-teal-900 text-[11px]">Add New Regulatory Reference</p>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      placeholder="Order / Scheme (e.g. BIS CRS)"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      className="input text-xs"
                      autoFocus
                    />
                    <input
                      placeholder="Regulatory obligation details"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      className="input text-xs sm:col-span-2"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setAddingSection(null)}
                      className="btn-ghost text-xs py-1 px-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddField('regulatoryMentions')}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Save Reference
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: CONFIRMATION ("Review before analysis")               */}
            {/* ------------------------------------------------------------- */}
            <Card padding="md" className="bg-white border-ink-200 shadow-soft">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Review Before Standards Discovery
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-700">
                    <span className="font-medium text-ink-900">
                      <strong>{totalRequirements}</strong> total requirements detected:
                    </span>
                    <span className="rounded bg-ivory-100 px-2 py-0.5 text-[11px] font-mono text-ink-700">
                      {totalParams} technical parameters
                    </span>
                    <span className="rounded bg-ivory-100 px-2 py-0.5 text-[11px] font-mono text-ink-700">
                      {totalPerf} performance criteria
                    </span>
                    <span className="rounded bg-ivory-100 px-2 py-0.5 text-[11px] font-mono text-ink-700">
                      {totalTesting} lab tests
                    </span>
                    <span className="rounded bg-ivory-100 px-2 py-0.5 text-[11px] font-mono text-ink-700">
                      {totalRegulatory} regulatory orders
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setStep('input')}
                      disabled={isSubmitting}
                    >
                      Edit Source Input
                    </Button>
                    <Button
                      size="md"
                      onClick={handleConfirmAndAnalyze}
                      disabled={isSubmitting}
                      rightIcon={isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                      className="shadow-soft active:scale-[0.98] transition-transform"
                    >
                      {isSubmitting ? 'Analyzing…' : 'Confirm & Find Applicable Standards'}
                    </Button>
                  </div>
                  {isSubmitting && submitStatusLabel && (
                    <p className="max-w-[280px] text-right text-[11px] text-ink-500">{submitStatusLabel}</p>
                  )}
                  {submitError && (
                    <p className="max-w-[300px] text-right text-[11px] font-medium text-error-600">{submitError}</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
