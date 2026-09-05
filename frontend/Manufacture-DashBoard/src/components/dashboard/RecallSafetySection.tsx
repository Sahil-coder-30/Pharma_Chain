import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { StatusBadge } from '../common/StatusBadge';
import {
  AlertOctagon,
  ShieldAlert,
  Radio,
  ArrowRight,
  Plus,
  Lock,
} from 'lucide-react';

export const RecallSafetySection: React.FC = () => {
  const { recalls, setActiveNav, setIsRecallModalOpen, setBatchToRecall } = useDashboard();

  const activeRecalls = recalls.filter((r) => r.status === 'ACTIVE');

  return (
    <div className="bg-white rounded-xl border border-rose-200/90 p-5 shadow-subtle relative overflow-hidden">
      {/* Red accent bar on top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
              <AlertOctagon className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">Recall & Safety Center</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
              <Radio className="w-3 h-3 text-rose-500" />
              Cascading Enforcement Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Instant supply-chain wide batch containment and POS checkout lock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBatchToRecall(null);
              setIsRecallModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Initiate Recall</span>
          </button>
        </div>
      </div>

      {/* 4 Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
            Active Recalls
          </span>
          <span className="text-2xl font-black text-rose-900 mt-1 block">
            {activeRecalls.length}
          </span>
          <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">
            Immediate Quarantine
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Affected Batches
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">7</span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
            Across 3 Facilities
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Affected Packs
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">12,450</span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
            92% Retrieved to Depots
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Critical Alerts
          </span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">2</span>
          <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
            Pharmacy POS Lock Enforced
          </span>
        </div>
      </div>

      {/* Recalls Mini-Table */}
      <div className="table-scroll-container max-h-[380px] rounded-xl border border-slate-200/80">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 shadow-xs">
            <tr className="bg-slate-50/95 backdrop-blur-md text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <th className="px-3.5 py-2.5">Batch ID</th>
              <th className="px-3.5 py-2.5">Medicine</th>
              <th className="px-3.5 py-2.5">Recall Reason</th>
              <th className="px-3.5 py-2.5">Date</th>
              <th className="px-3.5 py-2.5 text-right">Affected Packs</th>
              <th className="px-3.5 py-2.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {recalls.map((recall) => (
              <tr
                key={recall.id}
                onClick={() => setActiveNav('recalls')}
                className="hover:bg-rose-50/40 cursor-pointer transition-colors"
              >
                <td className="px-3.5 py-3 font-semibold text-rose-700 font-mono">
                  {recall.batchId}
                </td>
                <td className="px-3.5 py-3 font-medium text-slate-900">
                  {recall.medicineName}
                </td>
                <td className="px-3.5 py-3 text-slate-600 max-w-xs truncate">
                  {recall.reason}
                </td>
                <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                  {new Date(recall.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-3.5 py-3 text-right font-semibold text-slate-900">
                  {recall.affectedPacks.toLocaleString()}
                </td>
                <td className="px-3.5 py-3 text-center whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    <Lock className="w-2.5 h-2.5" /> ACTIVE RECALL
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-3 flex justify-end">
        <button
          onClick={() => setActiveNav('recalls')}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
        >
          <span>Open Full Recall Management Hub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
