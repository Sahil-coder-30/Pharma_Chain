import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useAuth } from '../../features/auth/hooks/auth.hooks';
import {
  Building2,
  ShieldCheck,
  Award,
  Users,
  MapPin,
  FileText,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';

export const CompanyProfileView: React.FC = () => {
  const { profile } = useDashboard();
  const { user, kycStatus } = useAuth();
  const activeProfile = user || profile;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl text-white font-extrabold text-xl flex items-center justify-center shadow-md ${
              kycStatus === 'APPROVED' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-amber-600 shadow-amber-600/20'
            }`}
          >
            {activeProfile.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{activeProfile.name}</h2>
              {kycStatus === 'APPROVED' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CDSCO Verified
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  KYC Pending Review
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Manufacturer ID: <code className="font-mono text-emerald-400">{activeProfile.id}</code> • Registered since {activeProfile.registeredAt}
            </p>
          </div>
        </div>

        {/* Compliance Verification Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-bold">CDSCO GxP Validated</span>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Legal & Regulatory Credentials */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                CDSCO Manufacturing Licenses
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  kycStatus === 'APPROVED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {kycStatus === 'APPROVED' ? 'Active & In Good Standing' : 'Under Regulatory Review'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                    Form 28-D Drug License #
                  </span>
                  <span className="font-mono font-bold text-[var(--text-primary)] mt-0.5 block">
                    {activeProfile.licenseNumber}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">Valid till Oct 2028</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                    CDSCO National Registration Code
                  </span>
                  <span className="font-mono font-bold text-[var(--text-primary)] mt-0.5 block">
                    {activeProfile.cdscoRegistration}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">Central Directorate</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                    Goods & Services Tax (GSTIN)
                  </span>
                  <span className="font-mono font-bold text-[var(--text-primary)] mt-0.5 block">
                    {activeProfile.gstin}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">✓ Tax Active</span>
              </div>
            </div>
          </div>

          {/* Plant Facilities */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Licensed Manufacturing Plants ({activeProfile.plantLocations.length})
              </h3>
            </div>

            <div className="space-y-3">
              {activeProfile.plantLocations.map((plant) => (
                <div
                  key={plant.facilityId}
                  className="p-3.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] flex items-start gap-3 text-xs"
                >
                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-emerald-400 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[var(--text-primary)]">{plant.name}</h4>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {plant.facilityId}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{plant.address}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-1">
                      <CheckCircle2 className="w-3 h-3" /> WHO-GMP Certified Facility
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Authorized Signatories & Digital Key Rep */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Authorized QA Personnel & Signatories
              </h3>
            </div>

            <div className="space-y-3">
              {activeProfile.authorizedPersonnel.map((person, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[var(--text-primary)]">{person.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Signatory
                    </span>
                  </div>
                  <p className="text-[var(--text-muted)] font-medium">{person.role}</p>
                  <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[var(--text-muted)]" /> {person.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[var(--text-muted)]" /> {person.phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corporate Headquarters */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 shadow-subtle text-xs space-y-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Registered Corporate Headquarters
            </span>
            <p className="text-[var(--text-primary)] font-medium">{activeProfile.headquarters}</p>
            <p className="text-[var(--text-muted)] text-[11px]">
              CIN: {activeProfile.cin || 'L24239DL2021PLC88491'} • CDSCO Zone: North Regional Directorate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
