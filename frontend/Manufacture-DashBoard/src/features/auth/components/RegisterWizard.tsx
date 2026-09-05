import React, { useState } from 'react';
import { useAuth } from '../hooks/auth.hooks';
import {
  Building2,
  Award,
  Users,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Trash2,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Calendar,
  Globe,
  MapPin,
  FileCheck2,
} from 'lucide-react';
import { ManufacturerRegisterPayload, KYCDocumentItem } from '../types/auth.types';

const INITIAL_FORM: ManufacturerRegisterPayload = {
  companyName: '',
  manufacturerId: '',
  companyCode: '',
  cinNumber: '',
  gstin: '',
  companyType: 'Formulation',
  headquarters: '',
  website: '',

  cdscoLicenseNo: '',
  cdscoRegistration: '',
  issuingAuthority: '',
  licenseExpiryDate: '',
  gmpStandard: 'WHO-GMP',
  kycDocs: [],

  primaryPlantName: '',
  primaryPlantFacilityId: '',
  primaryPlantAddress: '',
  authorizedPersonName: '',
  authorizedPersonRole: 'Head of Quality Assurance & QP',
  email: '',
  phone: '',
  idProofType: 'DIN',
  idProofNumber: '',

  password: '',
  confirmPassword: '',
  keyAlgorithm: 'ES256 (ECDSA P-256)',
  agreeTerms: false,
};

export const RegisterWizard: React.FC = () => {
  const { register, setAuthView, loading, error } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<ManufacturerRegisterPayload>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = <K extends keyof ManufacturerRegisterPayload>(
    key: K,
    value: ManufacturerRegisterPayload[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) errs.companyName = 'Company name is required';
    if (!form.cinNumber.trim()) errs.cinNumber = 'Corporate Identity Number (CIN) is required';
    if (!form.gstin.trim()) {
      errs.gstin = 'GSTIN is required';
    } else if (form.gstin.trim().length !== 15) {
      errs.gstin = 'GSTIN must be 15 alphanumeric characters';
    }
    if (!form.headquarters.trim()) errs.headquarters = 'Headquarters address is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!form.cdscoLicenseNo.trim()) errs.cdscoLicenseNo = 'Form 28/28-D Drug License # is required';
    if (!form.cdscoRegistration.trim()) errs.cdscoRegistration = 'CDSCO portal registration code is required';
    if (!form.issuingAuthority.trim()) errs.issuingAuthority = 'Issuing State Licensing Authority is required';
    if (!form.licenseExpiryDate) errs.licenseExpiryDate = 'License expiry date is required';
    if (form.kycDocs.length === 0) errs.kycDocs = 'Please upload at least one CDSCO license verification document';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!form.primaryPlantName.trim()) errs.primaryPlantName = 'Primary manufacturing plant name is required';
    if (!form.primaryPlantFacilityId.trim()) errs.primaryPlantFacilityId = 'Facility ID code is required';
    if (!form.primaryPlantAddress.trim()) errs.primaryPlantAddress = 'Plant address is required';
    if (!form.authorizedPersonName.trim()) errs.authorizedPersonName = 'Qualified Person (QP) name is required';
    if (!form.email.trim()) {
      errs.email = 'Corporate official email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Please enter a valid official email address';
    }
    if (!form.phone.trim()) errs.phone = 'Emergency contact phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep4 = () => {
    const errs: Record<string, string> = {};
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (!form.agreeTerms) {
      errs.agreeTerms = 'You must accept the statutory compliance undertaking to proceed';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
    else if (currentStep === 3 && validateStep3()) setCurrentStep(4);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep4()) return;

    try {
      await register(form);
    } catch (err) {
      // handled
    }
  };

  const handleAddMockFile = () => {
    const newDoc: KYCDocumentItem = {
      id: `doc-${Date.now()}`,
      name: `CDSCO_Approval_Doc_${Math.floor(100 + Math.random() * 900)}.pdf`,
      type: 'application/pdf',
      size: 1400000,
      uploadDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
      status: 'UPLOADED',
    };
    setForm((prev) => ({ ...prev, kycDocs: [...prev.kycDocs, newDoc] }));
  };

  const handleRemoveDoc = (id: string) => {
    setForm((prev) => ({ ...prev, kycDocs: prev.kycDocs.filter((d) => d.id !== id) }));
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score += 25;
    if (/[A-Z]/.test(p)) score += 25;
    if (/[0-9]/.test(p)) score += 25;
    if (/[^A-Za-z0-9]/.test(p)) score += 25;
    return score;
  };

  const stepsMeta = [
    { num: 1, title: 'Entity Identity', icon: <Building2 className="w-4 h-4" /> },
    { num: 2, title: 'CDSCO Licensing', icon: <Award className="w-4 h-4" /> },
    { num: 3, title: 'Plant & Officer', icon: <Users className="w-4 h-4" /> },
    { num: 4, title: 'Key Vault & Undertaking', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600" />

        {/* Header */}
        <div className="pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 dark:text-amber-300 border border-amber-500/20">
              CDSCO Form 28-D Statutory Onboarding
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight mt-1">
            Manufacturer Unit Registration
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Register manufacturing facility, upload drug licenses & configure cryptographic key vault
          </p>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-6">
          {stepsMeta.map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 dark:text-amber-300 ring-1 ring-amber-500/30 shadow-xs'
                    : isDone
                    ? 'bg-[var(--bg-element)] border-amber-500/20 text-amber-500/80'
                    : 'bg-[var(--bg-element)]/50 border-[var(--border)] text-[var(--text-muted)] opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone
                      ? 'bg-amber-500 text-black font-black'
                      : isCurrent
                      ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}
                >
                  {isDone ? '✓' : s.num}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
                    Step 0{s.num}
                  </p>
                  <p className="text-xs font-bold truncate">{s.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <span className="font-bold">Submission Error:</span> {error}
            </div>
          </div>
        )}

        {/* Step Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* STEP 1: Corporate & Legal Entity */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Legal Company Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="e.g. MedCore Pharmaceuticals Ltd."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.companyName && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.companyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Manufacturer Code / Prefix
                  </label>
                  <input
                    type="text"
                    value={form.companyCode || ''}
                    onChange={(e) => updateField('companyCode', e.target.value.toUpperCase())}
                    placeholder="e.g. MFR-MEDCORE"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Used for systemBatchId prefix</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Organization Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={form.companyType}
                    onChange={(e) => updateField('companyType', e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Formulation">Finished Formulation (OSD / Injections / Syrups)</option>
                    <option value="API">Active Pharmaceutical Ingredient (API)</option>
                    <option value="Biologics / Vaccines">Biologics & Vaccines</option>
                    <option value="Contract Manufacturing (CMO)">Contract Manufacturing Org (CMO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Corporate Identity Number (CIN) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.cinNumber}
                    onChange={(e) => updateField('cinNumber', e.target.value.toUpperCase())}
                    placeholder="e.g. L24239DL2021PLC378291"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.cinNumber && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.cinNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    GSTIN Number (15 Digits) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={form.gstin}
                    onChange={(e) => updateField('gstin', e.target.value.toUpperCase())}
                    placeholder="e.g. 07AAACM1234F1Z8"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.gstin && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.gstin}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Registered Corporate Headquarters <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.headquarters}
                    onChange={(e) => updateField('headquarters', e.target.value)}
                    placeholder="Full street address, city, state, pin code"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.headquarters && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.headquarters}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CDSCO Drug Licensing & Documents */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Form 28/28-D Drug License # <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.cdscoLicenseNo}
                    onChange={(e) => updateField('cdscoLicenseNo', e.target.value.toUpperCase())}
                    placeholder="e.g. CDSCO-MFG-DL-2024-88491"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.cdscoLicenseNo && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.cdscoLicenseNo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    CDSCO National Portal Reg # <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.cdscoRegistration}
                    onChange={(e) => updateField('cdscoRegistration', e.target.value.toUpperCase())}
                    placeholder="e.g. REG-INDIA-2021-77810"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.cdscoRegistration && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.cdscoRegistration}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    State Licensing Authority (SLA) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.issuingAuthority}
                    onChange={(e) => updateField('issuingAuthority', e.target.value)}
                    placeholder="e.g. State Drug Controller, Himachal Pradesh"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.issuingAuthority && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.issuingAuthority}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    License Validity / Expiry Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.licenseExpiryDate}
                    onChange={(e) => updateField('licenseExpiryDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.licenseExpiryDate && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.licenseExpiryDate}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    GMP Certification Standard
                  </label>
                  <select
                    value={form.gmpStandard}
                    onChange={(e) => updateField('gmpStandard', e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="WHO-GMP">WHO-GMP (World Health Organization Standard)</option>
                    <option value="Schedule M (India)">Revised Schedule M — Good Manufacturing Practices (India)</option>
                    <option value="EU-GMP">European Union GMP (EudraLex Vol 4)</option>
                    <option value="US-FDA cGMP">US FDA 21 CFR Part 211 cGMP</option>
                  </select>
                </div>
              </div>

              {/* KYC Document Upload Vault */}
              <div className="mt-4 p-4 rounded-2xl bg-[var(--bg-element)]/60 border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      CDSCO KYC Document Vault (Required for Approval)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMockFile}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/30"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Attach Document</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {form.kycDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{doc.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {(doc.size / 1024 / 1024).toFixed(2)} MB • Uploaded {doc.uploadDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Ready for KYC Review
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.kycDocs && (
                  <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.kycDocs}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Plant & Authorized Personnel */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Primary Manufacturing Unit / Plant Details
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Primary Plant Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.primaryPlantName}
                    onChange={(e) => updateField('primaryPlantName', e.target.value)}
                    placeholder="e.g. Baddi Formulation Unit 1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.primaryPlantName && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.primaryPlantName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Facility ID Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.primaryPlantFacilityId}
                    onChange={(e) => updateField('primaryPlantFacilityId', e.target.value.toUpperCase())}
                    placeholder="e.g. FAC-HP-01"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.primaryPlantFacilityId && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.primaryPlantFacilityId}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Plant Location / Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.primaryPlantAddress}
                    onChange={(e) => updateField('primaryPlantAddress', e.target.value)}
                    placeholder="Plot & Industrial Estate Address, District, State, PIN"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.primaryPlantAddress && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.primaryPlantAddress}</p>
                  )}
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-[var(--border)]">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Authorized Qualified Person (QP) / Quality Head
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.authorizedPersonName}
                    onChange={(e) => updateField('authorizedPersonName', e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.authorizedPersonName && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.authorizedPersonName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={form.authorizedPersonRole}
                    onChange={(e) => updateField('authorizedPersonRole', e.target.value)}
                    placeholder="e.g. Head of QA & Qualified Person"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Official Corporate Email (Login ID) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="e.g. rajesh.sharma@medcorepharma.in"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  {errors.email && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Emergency Contact Phone <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+91 98110 44219"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  {errors.phone && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Security Credentials & Key Vault Setup */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Vault Mode Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-emerald-300">Asymmetric ES256 Keystore Integration</h4>
                  <p className="text-[var(--text-muted)] mt-0.5">
                    Upon CDSCO KYC approval, <code className="font-mono text-emerald-400">pharma-core:4000</code> will provision a unique NIST P-256 ECDSA keypair stored in AES-256-GCM vault to sign batch QR codes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Portal Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.confirmPassword || ''}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Password Strength Indicator */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Security Strength:</span>
                  <span className="font-bold text-emerald-400">
                    {passwordStrength() >= 100
                      ? 'Strong (ECDSA Ready)'
                      : passwordStrength() >= 50
                      ? 'Moderate'
                      : 'Weak'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-element)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordStrength() >= 100
                        ? 'bg-emerald-400'
                        : passwordStrength() >= 50
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${passwordStrength()}%` }}
                  />
                </div>
              </div>

              {/* Statutory Undertaking Checkbox */}
              <div className="p-4 rounded-2xl bg-[var(--bg-element)]/80 border border-[var(--border)] space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.agreeTerms}
                    onChange={(e) => updateField('agreeTerms', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[var(--border)] text-emerald-500 focus:ring-emerald-500 bg-[var(--bg-element)] shrink-0"
                  />
                  <div className="text-xs text-[var(--text-secondary)]">
                    <span className="font-bold text-[var(--text-primary)]">
                      Statutory Undertaking under Drugs & Cosmetics Act, 1940:
                    </span>{' '}
                    We declare that all uploaded Form 28-D licenses, plant certifications, and authorized QP credentials are authentic. We authorize PharmaChain to register our entity on the Hyperledger Fabric channel for track-and-trace compliance.
                  </div>
                </label>
                {errors.agreeTerms && (
                  <p className="text-[11px] text-rose-400 font-medium pl-7">{errors.agreeTerms}</p>
                )}
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-5 border-t border-[var(--border)]">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--bg-active)] border border-[var(--border)] text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                ← Back to Login
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <span>Continue to Step 0{currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting to CDSCO Gateway...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit CDSCO Registration</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
