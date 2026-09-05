import React, { useMemo } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { Pill, TrendingUp, ArrowRight } from 'lucide-react';

export const TopProductsSection: React.FC = () => {
  const { batches, setActiveNav } = useDashboard();

  const topProducts = useMemo(() => {
    if (batches.length === 0) return [];
    const map: Record<string, { medicineName: string; dosage: string; packsCount: number; batchesCount: number }> = {};
    for (const b of batches) {
      if (!map[b.medicineName]) {
        map[b.medicineName] = {
          medicineName: b.medicineName,
          dosage: b.dosage || '500mg',
          packsCount: 0,
          batchesCount: 0,
        };
      }
      map[b.medicineName].packsCount += b.packsMinted || 0;
      map[b.medicineName].batchesCount += 1;
    }
    const list = Object.values(map).sort((a, b) => b.packsCount - a.packsCount);
    const maxPacks = list[0]?.packsCount || 1;
    return list.slice(0, 4).map((item, idx) => ({
      id: `PROD-${idx}`,
      ...item,
      share: Math.round((item.packsCount / maxPacks) * 100),
    }));
  }, [batches]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Top Products</h3>
          <p className="text-xs text-slate-500 mt-0.5">High-volume pharmaceutical formulations</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
          <Pill className="w-4 h-4" />
        </div>
      </div>

      {/* Product List */}
      <div className="divide-y divide-slate-100 my-2 space-y-2">
        {topProducts.length > 0 ? (
          topProducts.map((prod) => (
            <div key={prod.id} className="pt-2.5 first:pt-1">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{prod.medicineName}</span>
                  <span className="text-[11px] text-slate-500 block">{prod.dosage}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">
                    {prod.packsCount >= 1000 ? `${(prod.packsCount / 1000).toFixed(0)}k packs` : prod.packsCount}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {prod.batchesCount} batches
                  </span>
                </div>
              </div>

              {/* Velocity Progress Bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full"
                    style={{ width: `${prod.share}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  {prod.share}%
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No batches registered yet.
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => setActiveNav('inventory')}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
        >
          <span>View All 84 Products</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
