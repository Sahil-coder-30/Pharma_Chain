import React, { useMemo } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  History,
  CheckCircle2,
  AlertOctagon,
  QrCode,
  Truck,
  FileCheck,
  ArrowRight,
} from 'lucide-react';

export const ActivityTimeline: React.FC = () => {
  const { batches, setActiveNav } = useDashboard();

  const liveTimeline = useMemo(() => {
    if (batches.length === 0) return [];
    return batches.slice(0, 5).map((b) => ({
      id: b.id,
      title: `${b.medicineName} (${b.id})`,
      timestamp: new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description: b.mintStatus === 'MINTED'
        ? `Signed with ES256 key and minted ${b.packsMinted?.toLocaleString()} packs`
        : b.mintStatus === 'RECALLED'
        ? `Quarantined with RECALL state: ${b.recallReason || 'CDSCO directive'}`
        : `Batch registered in manufacturer database with status ${b.mintStatus}`,
      badge: b.mintStatus === 'MINTED' ? 'MINTED' : b.mintStatus === 'RECALLED' ? 'RECALL' : 'AUDIT',
    }));
  }, [batches]);

  const getEventIcon = (badge: string) => {
    switch (badge) {
      case 'MINTED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'RECALL':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />;
      case 'QR READY':
        return <QrCode className="w-3.5 h-3.5 text-brand-600" />;
      case 'SHIPPED':
        return <Truck className="w-3.5 h-3.5 text-indigo-600" />;
      case 'AUDIT':
      default:
        return <FileCheck className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Recent Supply Chain Activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">Immutable audit event log</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
          <History className="w-4 h-4" />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-6 space-y-4 my-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {liveTimeline.length > 0 ? (
          liveTimeline.map((item) => (
            <div key={item.id} className="relative group">
              {/* Dot / Icon */}
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-sm">
                {getEventIcon(item.badge)}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {item.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No recent activity logged.
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => setActiveNav('ledger')}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
        >
          <span>Explore Blockchain State Transitions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
