import React from 'react';
import { useDashboard } from '../Hooks/dashboard.hooks';
import {
  AlertOctagon,
  ShieldAlert,
  Radio,
  ArrowRight,
  Lock,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const DashboardSafety: React.FC = () => {
  const { recalls, navigateTo, setIsIncidentModalOpen } = useDashboard();
  const activeRecalls = recalls.filter(
    (r) => r.status === 'ACTIVE' || (r as any).severity === 'CRITICAL' || (r as any).affectedPacksInStock > 0
  );

  if (activeRecalls.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6 shadow-subtle relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  CDSCO Quality & Safety Clearance: All Clear
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  No Active Recalls
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Zero active recalls affecting your registered inventory. All stocked formulations are CDSCO verified.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Report Suspicious Pack</span>
            </button>
            <button
              onClick={() => navigateTo('recalls')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-active)] border border-[var(--border)] flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>Recall Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active CDSCO Recall Warning Banner */}
      <div className="rounded-3xl border border-[var(--alert-danger-border)] bg-[var(--alert-danger-bg)] p-5 sm:p-6 shadow-subtle relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-[var(--alert-danger-badge-bg)] text-[var(--alert-danger-icon)] border border-[var(--alert-danger-border)] shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[var(--alert-danger-heading)]">
                  Active CDSCO Statutory Recalls ({activeRecalls.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--alert-danger-badge-bg)] text-[var(--alert-danger-badge-text)] border border-[var(--alert-danger-border)] flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-[var(--alert-danger-icon)]" />
                  Automatic POS Barcode Lock Active
                </span>
              </div>
              <p className="text-xs text-[var(--alert-danger-text)] font-medium max-w-2xl">
                Recalled batches are locked on this terminal. Counter POS checkout will be automatically blocked for these serials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Report Suspicious Pack</span>
            </button>

            <button
              onClick={() => navigateTo('recalls')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-active)] border border-[var(--border)] flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>Recall Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recalled Batch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--alert-danger-border)]">
          {activeRecalls.map((rec) => (
            <div
              key={rec.id}
              onClick={() => navigateTo('recalls')}
              className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--alert-danger-border)] flex items-start justify-between gap-3 cursor-pointer hover:border-rose-500 transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[var(--alert-danger-text)]">
                    {rec.batchId}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    LOCK: {rec.severity}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] mt-1">{rec.medicineName}</h4>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{rec.reason}</p>
              </div>
              <Lock className="w-4 h-4 text-rose-500 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
