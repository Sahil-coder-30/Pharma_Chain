import React, { useState, useMemo } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import {
  Clock,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Truck,
  Archive,
} from 'lucide-react';

export const ExpiryMonitorSection: React.FC = () => {
  const { batches, setActiveNav } = useDashboard();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'ALL' | '30' | '60' | '90' | 'EXPIRED'>('30');

  const filteredItems = useMemo(() => {
    const now = Date.now();
    return batches
      .map((b) => {
        const expTime = new Date(b.expiryDate).getTime();
        const daysRemaining = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));
        const risk = daysRemaining <= 0 ? 'EXPIRED' : daysRemaining <= 30 ? 'CRITICAL_30' : daysRemaining <= 60 ? 'WARNING_60' : 'MONITOR_90';
        return {
          id: b.id,
          batchId: b.id,
          medicineName: b.medicineName,
          dosage: b.dosage,
          expiryDate: b.expiryDate,
          daysRemaining,
          quantity: b.totalQuantity,
          risk,
        };
      })
      .filter((item) => {
        if (activeTab === '30') return item.risk === 'CRITICAL_30';
        if (activeTab === '60') return item.risk === 'WARNING_60';
        if (activeTab === '90') return item.risk === 'MONITOR_90';
        if (activeTab === 'EXPIRED') return item.risk === 'EXPIRED';
        return true;
      });
  }, [batches, activeTab]);

  const handlePriorityDispatch = (batchId: string) => {
    showToast({
      type: 'info',
      title: 'Priority Dispatch Marked',
      message: `Batch ${batchId} prioritized for fast-track pharmacy fulfillment.`,
    });
  };

  const handleQuarantine = (batchId: string) => {
    showToast({
      type: 'warning',
      title: 'Warehouse Quarantine Order',
      message: `Batch ${batchId} locked in warehouse quarantine buffer zone.`,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Expiry Monitoring</h3>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              12 Batches Near Expiry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated supply chain FEFO inventory rotation alerts
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
          {[
            { id: '30', label: '< 30 Days' },
            { id: '60', label: '60 Days' },
            { id: '90', label: '90 Days' },
            { id: 'EXPIRED', label: 'Expired' },
            { id: 'ALL', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-slate-100 my-2 max-h-72 overflow-y-auto">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="py-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-lg transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  item.risk === 'EXPIRED'
                    ? 'bg-rose-100 text-rose-600'
                    : item.risk === 'CRITICAL_30'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.risk === 'EXPIRED' ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {item.medicineName}
                  </span>
                  <span className="text-[10px] font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
                    {item.batchId}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                  <span>Dosage: {item.dosage}</span>
                  <span>•</span>
                  <span>Qty: {item.quantity.toLocaleString()} units</span>
                  <span>•</span>
                  <span
                    className={`font-semibold ${
                      item.daysRemaining < 0
                        ? 'text-rose-600'
                        : item.daysRemaining <= 30
                        ? 'text-amber-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.daysRemaining < 0
                      ? `Expired ${Math.abs(item.daysRemaining)} days ago`
                      : `Expires in ${item.daysRemaining} days (${new Date(
                          item.expiryDate
                        ).toLocaleDateString('en-GB')})`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {item.risk === 'EXPIRED' ? (
                <button
                  onClick={() => handleQuarantine(item.batchId)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1"
                >
                  <Archive className="w-3 h-3" />
                  <span>Quarantine</span>
                </button>
              ) : (
                <button
                  onClick={() => handlePriorityDispatch(item.batchId)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 transition-colors flex items-center gap-1"
                >
                  <Truck className="w-3 h-3" />
                  <span>Priority Dispatch</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => setActiveNav('inventory')}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
        >
          <span>Manage Full Medicine Inventory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
