import React from 'react';
import { useDashboard } from '../Hooks/dashboard.hooks';
import {
  Layers,
  PackageCheck,
  Truck,
  AlertOctagon,
  TrendingUp,
  ShieldCheck,
  Building2,
  RefreshCw,
  Plus,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const DashboardStats: React.FC = () => {
  const { stats, batches, profile, navigateTo, dateRange, setDateRange, loadDashboard } = useDashboard();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await loadDashboard();
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  const totalBatches = stats.totalBatches || batches.length || 31;
  const totalPacksMinted = stats.mintedPacksNumber || 210960;
  const activeRecalls = stats.recalledBatches || stats.activeRecalls || 2;
  const dispatchedUnits = stats.activeDispatches ? stats.activeDispatches * 12000 : 95000;
  const warehouseStock = Math.max(0, totalPacksMinted - dispatchedUnits);
  const capacityPct = Math.min(100, Math.round((totalPacksMinted / 250000) * 100));

  return (
    <div className="space-y-4">
      {/* ─── 1. Panoramic Facility Operational Command Strip ─── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border border-[var(--border)] shadow-xs">
        {/* Left: Verified Facility & Node Identity */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {profile?.name || 'Bharat Biotech Bio-Pharma Ltd.'}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                CDSCO Verified Facility
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-element)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                {profile?.licenseNumber || 'CDSCO-MFG-DL-2024-88491'}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-[var(--text-muted)] mt-1 flex-wrap font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-pulse" />
                Hyperledger Fabric 2.5: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Synchronized</strong>
              </span>
              <span className="text-[var(--text-muted)]/40">•</span>
              <span>Block #1,489,203</span>
              <span className="text-[var(--text-muted)]/40">•</span>
              <span>ECDSA P-256 HSM Vault</span>
              <span className="text-[var(--text-muted)]/40">•</span>
              <span className="text-cyan-600 dark:text-cyan-400">Schedule M Compliant</span>
            </div>
          </div>
        </div>

        {/* Right: Date Range Selector & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start xl:self-center">
          {/* Timeframe Chips */}
          <div className="flex items-center bg-[var(--bg-element)] p-1 rounded-xl border border-[var(--border)] text-xs">
            {['7 Days', '30 Days', '90 Days', 'Custom'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range as any)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  (dateRange || '30 Days') === range
                    ? 'bg-cyan-600 dark:bg-cyan-500 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--bg-active)] border border-[var(--border)] text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Blockchain Ledger State"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-600 dark:text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Node</span>
          </button>

          {/* Register Batch Primary CTA */}
          <button
            onClick={() => navigateTo('create-batch')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Batch</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Four Widescreen Telemetry Pods (Expansive, No Truncation) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* POD 1: Production Volume & Batch Quota */}
        <div
          onClick={() => navigateTo('batches')}
          className="glass-card rounded-2xl p-5 border border-[var(--border)] hover:border-cyan-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-lg"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 status-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
                  Production Batches
                </span>
              </div>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-[var(--text-primary)]">
                  {totalBatches}
                </span>
                <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
                  batches registered
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                <strong className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono">{totalPacksMinted.toLocaleString()}</strong> units in active production
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[var(--text-muted)]">Monthly Quota</span>
              <span className="font-bold text-[var(--text-primary)]">{capacityPct}% ({totalPacksMinted.toLocaleString()} / 250k)</span>
            </div>
            <div className="w-full bg-[var(--bg-element)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${capacityPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-0.5 font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +14.2% vs last cycle
              </span>
              <span>3 Active Lines</span>
            </div>
          </div>
        </div>

        {/* POD 2: Cryptographic GS1 Serialization */}
        <div
          onClick={() => navigateTo('qr-codes')}
          className="glass-card rounded-2xl p-5 border border-[var(--border)] hover:border-emerald-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-lg"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 status-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
                  Cryptographic Serials
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
                  {totalPacksMinted.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
                  packs minted
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                ECDSA P-256 digital signature embedded in GS1 DataMatrix
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>99.98% Verification Rate</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-mono">0 Counterfeit Detections</p>
            </div>

            <div className="w-16 h-5 flex items-end gap-0.5 shrink-0">
              {[35, 50, 65, 55, 80, 75, 90, 100].map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-emerald-500/30 rounded-t-xs group-hover:bg-emerald-400 transition-colors"
                  style={{ height: `${val}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* POD 3: Supply Chain Logistics & Inventory */}
        <div
          onClick={() => navigateTo('inventory')}
          className="glass-card rounded-2xl p-5 border border-[var(--border)] hover:border-cyan-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-lg"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 status-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
                  Supply Chain Transit
                </span>
              </div>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Truck className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-[var(--text-primary)]">
                  {dispatchedUnits.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
                  dispatched units
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                8 freight shipments en route to certified distributor hubs
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[var(--text-muted)]">Stock vs Transit</span>
              <span className="font-bold text-[var(--text-primary)]">
                {warehouseStock.toLocaleString()} in WH • {dispatchedUnits.toLocaleString()} Transit
              </span>
            </div>
            {/* Split Distribution Bar */}
            <div className="w-full bg-[var(--bg-element)] h-2 rounded-full overflow-hidden flex border border-[var(--border)]">
              <div className="bg-cyan-500 h-full" style={{ width: '55%' }} title="Warehouse Stock" />
              <div className="bg-emerald-500 h-full" style={{ width: '45%' }} title="In Transit" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-0.5 font-mono">
              <span>Cold-chain: 2°C - 8°C OK</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">142k Warehouse Reserve</span>
            </div>
          </div>
        </div>

        {/* POD 4: Statutory Isolation & Recalls */}
        <div
          onClick={() => navigateTo('recalls')}
          className="glass-card rounded-2xl p-5 border border-rose-500/30 hover:border-rose-500/60 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-lg"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 status-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono">
                  Statutory Recalls
                </span>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-rose-600 dark:text-rose-400">
                  {activeRecalls}
                </span>
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400 font-mono">
                  active isolation notices
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                GSR 1337(E) quarantine active • POS checkout locks broadcasted
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                <Lock className="w-3 h-3" />
                100% Retail POS Locked
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Form 28-A Filed
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
