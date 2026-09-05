import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  ShieldCheck,
  Building2,
  Key,
  Award,
  CheckCircle2,
  Lock,
  ArrowUpRight,
} from 'lucide-react';

export const ManufacturerVerificationCard: React.FC = () => {
  const { profile, setActiveNav } = useDashboard();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Manufacturer Verification</h3>
          <p className="text-xs text-slate-500 mt-0.5">Cryptographic identity & CDSCO compliance</p>
        </div>
        <div className="p-2 rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
          <Award className="w-4 h-4" />
        </div>
      </div>

      {/* Main Profile Info */}
      <div className="my-3.5 space-y-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              MC
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{profile.name}</h4>
              <p className="text-[11px] text-slate-500 font-mono">ID: {profile.code}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified MFR
          </span>
        </div>

        {/* 4 Identity Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Drug License
            </span>
            <span className="font-semibold text-slate-900 mt-0.5 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active (Form 28-D)
            </span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">
              {profile.licenseNumber}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              CDSCO KYC Status
            </span>
            <span className="font-semibold text-emerald-700 mt-0.5 block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Verified
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {profile.cdscoRegistration}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Digital Identity
            </span>
            <span className="font-semibold text-indigo-700 mt-0.5 block flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              Active
            </span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">
              {profile.id}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Key Vault Status
            </span>
            <span className="font-semibold text-slate-900 mt-0.5 block flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-brand-600" />
              ES256 Protected
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              AES-256-GCM Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Profile Button */}
      <button
        onClick={() => setActiveNav('profile')}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 hover:border-brand-300 text-xs font-semibold text-slate-700 hover:text-brand-600 bg-slate-50 hover:bg-white transition-all shadow-subtle"
      >
        <span>View Full Regulatory Credentials</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
