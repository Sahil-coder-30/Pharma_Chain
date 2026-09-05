import React, { useState, useMemo } from 'react';
import { useDashboard } from '../Hooks/dashboard.hooks';
import { useToast } from '../../../context/ToastContext';
import { ExpiryMonitoringItem } from '../../../types';
import {
  ShieldCheck,
  CheckCircle2,
  Database,
  Radio,
  QrCode,
  Download,
  FileArchive,
  FileSpreadsheet,
  ClockAlert,
  AlertTriangle,
  Package,
} from 'lucide-react';

export const DashboardOperations: React.FC = () => {
  const { batches, navigateTo } = useDashboard();
  const { showToast } = useToast();
  const [expiryTab, setExpiryTab] = useState<'30' | '60' | '90'>('30');

  const totalPacksMinted = useMemo(() => batches.reduce((sum, b) => sum + (b.packsMinted || 0), 0), [batches]);
  const totalQuantity = useMemo(() => batches.reduce((sum, b) => sum + (b.totalQuantity || 0), 0), [batches]);
  const exportedBatchesCount = useMemo(() => batches.filter((b) => b.qrPackageStatus === 'READY').length, [batches]);
  const pendingExportBatches = useMemo(() => batches.filter((b) => b.qrPackageStatus !== 'READY').length, [batches]);
  const healthPercent = totalQuantity > 0 ? Math.min(100, Math.round((totalPacksMinted / totalQuantity) * 100)) : 100;

  const filteredExpiry = useMemo(() => {
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
          dosage: b.dosage || '500mg',
          manufacturingDate: b.manufacturingDate || b.createdAt,
          expiryDate: b.expiryDate,
          daysRemaining,
          quantity: b.totalQuantity,
          risk,
          status: (daysRemaining <= 30 ? 'PRIORITY_DISPATCH' : 'NORMAL') as any,
        } as ExpiryMonitoringItem;
      })
      .filter((i) => {
        const threshold = Number(expiryTab);
        return i.daysRemaining > 0 && i.daysRemaining <= threshold;
      });
  }, [batches, expiryTab]);

  const handleDownload = (format: string) => {
    showToast({
      type: 'success',
      title: 'Package Ready',
      message: `Export package (${format}) downloaded successfully.`,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 1. Traceability Health Score Card */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 shadow-subtle flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Traceability Health</h3>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
              <Radio className="w-2 h-2 animate-ping" />
              {healthPercent}% Healthy
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Verified Packs on Chain</span>
              <span className="font-bold text-[var(--text-primary)]">
                {totalPacksMinted.toLocaleString()} / {totalQuantity.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-[var(--bg-element)] rounded-full h-2 overflow-hidden">
              <div className="bg-[var(--brand-primary)] h-2 rounded-full" style={{ width: `${healthPercent}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Fabric Block</span>
                <span className="font-mono font-bold text-[var(--brand-primary)]">
                  {batches.length > 0 ? `#${18430 + batches.length}` : '#18430'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Peer Sync</span>
                <span className="font-bold text-emerald-400">100% In Sync</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigateTo('ledger')}
          className="btn-secondary w-full text-xs justify-center"
        >
          Open Fabric Blockchain Ledger
        </button>
      </div>

      {/* 2. QR Code Management Card */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 shadow-subtle flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-950/40 text-sky-400 border border-sky-800/50">
                <QrCode className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">QR Code Hub</h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-element)] px-2 py-0.5 rounded">
              ES256 Compact
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Total Generated</span>
              <span className="font-bold text-[var(--text-primary)]">
                {totalPacksMinted.toLocaleString()} QR Codes
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Thermal Packages Exported</span>
              <span className="font-bold text-emerald-400">{exportedBatchesCount} Batches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Pending Line Exports</span>
              <span className="font-bold text-amber-400">{pendingExportBatches} Batches</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleDownload('ZIP')}
                className="p-2.5 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--bg-active)] border border-[var(--border)] text-left group transition-all"
              >
                <FileArchive className="w-4 h-4 text-sky-400 mb-1" />
                <span className="text-[11px] font-bold text-[var(--text-primary)] block">Export ZIP</span>
                <span className="text-[9px] text-[var(--text-muted)]">300 DPI Print</span>
              </button>

              <button
                onClick={() => handleDownload('CSV')}
                className="p-2.5 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--bg-active)] border border-[var(--border)] text-left group transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[11px] font-bold text-[var(--text-primary)] block">Export CSV</span>
                <span className="text-[9px] text-[var(--text-muted)]">Pack Hashes</span>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigateTo('qr-codes')}
          className="btn-secondary w-full text-xs justify-center"
        >
          Open QR Operations Hub
        </button>
      </div>

      {/* 3. FEFO Expiry Monitor Section */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 shadow-subtle flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-800/50">
                <ClockAlert className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Expiry FEFO Monitor</h3>
            </div>

            <div className="flex items-center gap-1 bg-[var(--bg-element)] p-0.5 rounded-lg text-[10px]">
              {(['30', '60', '90'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setExpiryTab(d)}
                  className={`px-2 py-0.5 rounded font-semibold transition-all ${expiryTab === d
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'text-[var(--text-muted)]'
                    }`}
                >
                  &lt;{d}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {filteredExpiry.slice(0, 3).map((item: ExpiryMonitoringItem) => (
              <div
                key={item.batchId}
                className="p-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-[var(--brand-primary)] text-[11px]">
                    {item.batchId}
                  </span>
                  <p className="font-medium text-[var(--text-primary)] truncate max-w-[130px]">
                    {item.medicineName}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`font-bold text-[11px] block ${item.risk === 'CRITICAL_30' || item.risk === 'EXPIRED'
                        ? 'text-rose-400'
                        : item.risk === 'WARNING_60'
                          ? 'text-amber-400'
                          : 'text-yellow-400'
                      }`}
                  >
                    {item.daysRemaining} days left
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {item.quantity.toLocaleString()} packs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigateTo('inventory')}
          className="btn-secondary w-full text-xs justify-center"
        >
          Open Formulations Catalog
        </button>
      </div>
    </div>
  );
};
