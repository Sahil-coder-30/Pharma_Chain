import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { Layers } from 'lucide-react';

export const BatchLifecycleDonut: React.FC = () => {
  const { batches } = useDashboard();

  const total = batches.length;
  const minted = batches.filter((b) => b.mintStatus === 'MINTED').length;
  const distributed = batches.filter((b) => b.mintStatus === 'DISTRIBUTED' || b.mintStatus === 'PACKAGED').length;
  const pending = batches.filter((b) => b.mintStatus === 'PENDING' || b.mintStatus === 'MINTING' || b.mintStatus === 'DRAFT').length;
  const recalled = batches.filter((b) => b.mintStatus === 'RECALLED').length;

  const data = useMemo(() => {
    if (total === 0) {
      return [{ name: 'No Batches Registered', value: 100, color: '#94a3b8', count: 0 }];
    }
    return [
      { name: 'Minted & Active', value: Math.round((minted / total) * 100), color: '#10b981', count: minted },
      { name: 'Distributed', value: Math.round((distributed / total) * 100), color: '#06b6d4', count: distributed },
      { name: 'In Pipeline', value: Math.round((pending / total) * 100), color: '#f59e0b', count: pending },
      { name: 'Recalled', value: Math.round((recalled / total) * 100), color: '#f43f5e', count: recalled },
    ];
  }, [total, minted, distributed, pending, recalled]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-800 text-xs">
          <p className="font-semibold text-slate-200">{entry.name}</p>
          <p className="text-white font-bold mt-0.5">
            {entry.count} batches ({entry.value}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Batch Lifecycle</h3>
          <p className="text-xs text-slate-500 mt-0.5">Status distribution across {total} batches</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
          <Layers className="w-4 h-4" />
        </div>
      </div>

      {/* Donut Chart & Center Metric */}
      <div className="relative h-48 w-full my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              innerRadius={58}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-extrabold text-slate-900 leading-none">{total}</span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 mt-1">Total Batches</span>
        </div>
      </div>

      {/* Legend List */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600 font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{item.count}</span>
              <span className="text-slate-400 text-[11px]">({item.value}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
