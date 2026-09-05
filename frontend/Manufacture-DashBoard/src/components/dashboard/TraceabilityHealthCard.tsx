import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowUpRight,
  Activity,
} from 'lucide-react';

export const TraceabilityHealthCard: React.FC = () => {
  const { stats, setActiveNav } = useDashboard();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Traceability Health</h3>
          <p className="text-xs text-slate-500 mt-0.5">End-to-end supply chain integrity score</p>
        </div>
        <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <Activity className="w-4 h-4" />
        </span>
      </div>

      {/* Main Score Display */}
      <div className="my-4 p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 via-slate-50 to-emerald-50/30 border border-emerald-100 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
              {stats.traceabilityHealth}%
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Healthy
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Zero integrity breaches detected across 1,842 retail endpoints
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <ShieldCheck className="w-7 h-7" />
        </div>
      </div>

      {/* 4 Metric Tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
            <Database className="w-3.5 h-3.5 text-brand-600" />
            <span>Blockchain Records</span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-1">{stats.blockchainRecordsCount}</p>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Packs</span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-1">{stats.verifiedPackages}</p>
        </div>

        <div
          onClick={() => setActiveNav('alerts')}
          className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Unresolved Alerts</span>
          </div>
          <p className="text-sm font-bold text-amber-900 mt-1">{stats.unresolvedAlertsCount ?? 0} Actions</p>
        </div>

        <div
          onClick={() => setActiveNav('recalls')}
          className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 cursor-pointer hover:bg-rose-50 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-rose-800 text-[11px] font-medium">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>Recalled Packs</span>
          </div>
          <p className="text-sm font-bold text-rose-900 mt-1">{(stats.recalledPacksCount ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Button Action */}
      <button
        onClick={() => setActiveNav('traceability')}
        className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 hover:border-brand-300 text-xs font-semibold text-slate-700 hover:text-brand-600 bg-white hover:bg-brand-50/30 transition-all shadow-subtle"
      >
        <span>Open Traceability Explorer</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
