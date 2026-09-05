import React from 'react';
import { useDashboard } from '../Hooks/dashboard.hooks';
import {
  AlertOctagon,
  ShieldAlert,
  ArrowRight,
  Plus,
  BellRing,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Check,
} from 'lucide-react';

export const DashboardSafety: React.FC = () => {
  const { recalls, alerts, navigateTo, setIsRecallModalOpen, resolveAlert } = useDashboard();

  const activeRecalls = recalls.filter((r) => r.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* 1. Active Recall Command Center */}
      <div className="glass-card rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-[var(--bg-surface)] to-[var(--bg-surface)] dark:from-rose-950/30 p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Active Supply Chain Recalls ({activeRecalls.length})
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  GSR 1337(E) Statutory Isolation
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] max-w-2xl">
                Batch quarantine is synchronized across all pharmacy terminals. Retail POS checkouts for recalled serials are rejected in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsRecallModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Issue Recall Notice</span>
            </button>

            <button
              onClick={() => navigateTo('recalls')}
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-element)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Recall Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recalled Cards Mini Grid */}
        {activeRecalls.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-rose-500/20">
            {activeRecalls.map((recall) => (
              <div
                key={recall.id}
                onClick={() => navigateTo('recalls')}
                className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-rose-500/30 hover:border-rose-400 transition-colors cursor-pointer group shadow-xs"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 group-hover:underline">
                    {recall.batchId}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-element)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                    {recall.affectedPacks.toLocaleString()} units
                  </span>
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {recall.medicineName}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                  {recall.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Quality Alerts & Fraud Interception Telemetry */}
      <div className="glass-card rounded-2xl border border-[var(--border)] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Security & Fraud Interception Telemetry
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Live cryptographic verification anomalies and cold-chain temperature telemetry
              </p>
            </div>
          </div>

          <button
            onClick={() => navigateTo('recalls')}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Recall & Safety Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {alerts.slice(0, 3).map((alert) => {
            const isCritical = alert.type === 'CRITICAL';
            const isWarning = alert.type === 'WARNING';

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCritical
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : isWarning
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-emerald-500/5 border-emerald-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isCritical
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : isWarning
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      {alert.title}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                      {alert.description}
                    </p>
                    {alert.location && (
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-1 font-medium">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>{alert.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!alert.resolved ? (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-element)] text-xs font-semibold text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardSafety;
