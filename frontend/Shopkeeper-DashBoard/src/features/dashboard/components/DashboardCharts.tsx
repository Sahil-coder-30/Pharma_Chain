import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, PieChart as PieIcon, PackageSearch } from 'lucide-react';
import { useDashboard } from '../Hooks/dashboard.hooks';

const PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];

export const DashboardCharts: React.FC = () => {
  const { inventory, sales } = useDashboard();

  // Dynamic category distribution computed from live inventory
  const categoryMap = new Map<string, number>();
  inventory.forEach((item) => {
    const cat = item.category || 'General';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.packCount || 0));
  });

  const totalInventoryPacks = inventory.reduce((acc, i) => acc + (i.packCount || 0), 0);

  const categoryData = Array.from(categoryMap.entries()).map(([name, count], idx) => ({
    name,
    value: totalInventoryPacks > 0 ? Math.round((count / totalInventoryPacks) * 100) : 0,
    count,
    color: PALETTE[idx % PALETTE.length],
  }));

  // Dynamic dispense velocity computed from live sales
  const timeBuckets = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];
  const hourlyMap = new Map<string, { packs: number; revenue: number }>();
  timeBuckets.forEach((t) => hourlyMap.set(t, { packs: 0, revenue: 0 }));

  sales.forEach((s) => {
    const date = s.timestamp ? new Date(s.timestamp) : new Date();
    const hour = date.getHours();
    const bucket = timeBuckets.find((b) => parseInt(b.split(':')[0], 10) >= hour) || '21:00';
    const curr = hourlyMap.get(bucket) || { packs: 0, revenue: 0 };
    curr.packs += (s.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
    curr.revenue += s.grandTotal || 0;
    hourlyMap.set(bucket, curr);
  });

  const hourlySales = timeBuckets.map((time) => ({
    time,
    packs: hourlyMap.get(time)?.packs || 0,
    revenue: hourlyMap.get(time)?.revenue || 0,
  }));

  const totalTodayRevenue = sales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* 1. Counter Dispense Velocity Chart (7 Cols) */}
      <div className="lg:col-span-7 bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border)] shadow-subtle flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Hourly Dispense Velocity & Revenue
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Live Point-of-Sale billing telemetry committed to Hyperledger Fabric
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Total Today: ₹{totalTodayRevenue.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Therapeutic Category Stock Mix (5 Cols) */}
      <div className="lg:col-span-5 bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border)] shadow-subtle flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Therapeutic Formulation Mix
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">Active shelf inventory by formulation category</p>
            </div>
          </div>
        </div>

        {categoryData.length > 0 ? (
          <>
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--border)]">
              {categoryData.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-[11px] text-[var(--text-muted)] truncate">{cat.name}</span>
                  <span className="text-[11px] font-bold text-[var(--text-primary)] ml-auto font-mono">{cat.value}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-52 flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-element)] flex items-center justify-center text-[var(--text-muted)] mb-2">
              <PackageSearch className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">No Active Inventory Stock</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Receive inbound distributor deliveries to populate formulation distribution.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
