import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { StatCard } from '../common/StatCard';
import {
  Layers,
  PackageCheck,
  Pill,
  ShieldCheck,
  AlertOctagon,
  ClockAlert,
} from 'lucide-react';

export const KPISection: React.FC = () => {
  const { stats, batches, setActiveNav } = useDashboard();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Total Batches */}
      <StatCard
        title="Total Batches"
        value={stats.totalBatches.toLocaleString()}
        trend={stats.totalBatchesTrend}
        trendLabel="vs last month"
        icon={<Layers className="w-5 h-5" />}
        variant="primary"
        sparklineData={[95, 110, 128, 132, 140, 145, 152, 162]}
        onClick={() => setActiveNav('batches')}
      />

      {/* 2. Minted Packs */}
      <StatCard
        title="Minted Packs"
        value={stats.mintedPacks}
        trend={stats.mintedPacksTrend}
        trendLabel="vs last month"
        icon={<PackageCheck className="w-5 h-5" />}
        variant="emerald"
        sparklineData={[165, 190, 220, 235, 250, 260, 278, 310]}
        onClick={() => setActiveNav('qr-codes')}
      />

      {/* 3. Active Products */}
      <StatCard
        title="Active Products"
        value={stats.activeProducts ?? (batches.length > 0 ? Array.from(new Set(batches.map(b => b.medicineName))).length : 0)}
        trend={stats.activeProductsTrend ?? 0}
        trendLabel="vs last month"
        icon={<Pill className="w-5 h-5" />}
        variant="indigo"
        sparklineData={[0, 0, 0, 0]}
        onClick={() => setActiveNav('inventory')}
      />

      {/* 4. Verified Packages */}
      <StatCard
        title="Verified Packs"
        value={stats.verifiedPackages || (stats.mintedPacksNumber ? `${stats.mintedPacksNumber.toLocaleString()} packs` : '0 packs')}
        subtitle={`${stats.verificationRate || '0%'} rate`}
        trend={0}
        trendLabel="integrity rate"
        icon={<ShieldCheck className="w-5 h-5" />}
        variant="emerald"
        sparklineData={[0, 0, 0, 0]}
        onClick={() => setActiveNav('traceability')}
      />

      {/* 5. Recalled Batches */}
      <StatCard
        title="Recalled Batches"
        value={stats.recalledBatches ?? 0}
        trend={stats.recalledBatchesTrend ?? 0}
        trendLabel="from last month"
        icon={<AlertOctagon className="w-5 h-5" />}
        variant="crimson"
        badge="Active"
        onClick={() => setActiveNav('recalls')}
      />

      {/* 6. Pending Actions */}
      <StatCard
        title="Pending Actions"
        value={stats.pendingActions ?? batches.filter(b => b.mintStatus === 'PENDING').length}
        subtitle="Requires QA review"
        trend={0}
        trendLabel="batch queue"
        icon={<ClockAlert className="w-5 h-5" />}
        variant="amber"
        onClick={() => setActiveNav('alerts')}
      />
    </div>
  );
};
