import React from 'react';
import { useDashboard } from '../Hooks/dashboard.hooks';
import { useAuth } from '../../auth/hooks/auth.hooks';
import {
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Radio,
  FileSpreadsheet,
  Boxes,
} from 'lucide-react';

export const DashboardHeader: React.FC = () => {
  const { profile, dateRange, setDateRange, navigateTo } = useDashboard();
  const { user, kycStatus } = useAuth();
  const activeProfile = user || profile;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
      {/* Top subtle amber ambient glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
        {/* Left: Enterprise Company Identity & Compliance Status */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {activeProfile.name || 'Sun Pharmaceutical Industries Ltd.'}
            </h1>

            {kycStatus === 'APPROVED' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                CDSCO Verified Manufacturer
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                KYC In Review
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1 font-mono text-[11px] bg-[var(--bg-element)] px-2 py-0.5 rounded-md border border-[var(--border)]">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Lic: {(activeProfile as any).licenseNumber || (activeProfile as any).licenseNo || 'CDSCO-MFG-DL-2024-88491'}</span>
            </span>

            <span className="hidden sm:inline">•</span>

            <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              <span>Hyperledger Fabric 2.5: Synchronized</span>
            </span>
          </div>
        </div>

        {/* Right: Date Range Selector & Action CTAs */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Segmented Date Range Filter */}
          <div className="inline-flex items-center p-1 bg-[var(--bg-element)] rounded-xl border border-[var(--border)] text-xs">
            <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)] ml-2 mr-1 shrink-0" />
            {(['Today', '7 Days', '30 Days', 'Custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  dateRange === range
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Formulations Catalog Button */}
          <button
            onClick={() => navigateTo('inventory')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--bg-active)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-emerald-500" />
            <span>Formulations Catalog</span>
          </button>

          {/* Primary Action Button: Create Batch */}
          <button
            onClick={() => navigateTo('create-batch')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Production Batch</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
