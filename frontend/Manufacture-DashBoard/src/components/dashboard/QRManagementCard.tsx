import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import {
  QrCode,
  Download,
  FileArchive,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export const QRManagementCard: React.FC = () => {
  const { stats, setActiveNav } = useDashboard();
  const { showToast } = useToast();

  const handleDownloadLatestPackage = () => {
    showToast({
      type: 'info',
      title: 'Downloading QR Archive',
      message: 'BATCH-2026-001_100k_Print_Package.zip (1.2 GB) initiating download...',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">QR Code Operations</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              ES256 Signed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">High-density 2D barcodes for packaging lines</p>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <QrCode className="w-4 h-4" />
        </div>
      </div>

      {/* 4 Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5 my-3.5">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
            QR Codes Generated
          </span>
          <span className="text-lg font-bold text-slate-900 mt-1 block">
            {stats.qrGeneratedCount || stats.mintedPacks || '0'}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
            <ShieldCheck className="w-3 h-3" /> 100% Cryptographically Signed
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
            Downloaded Packages
          </span>
          <span className="text-lg font-bold text-slate-900 mt-1 block">
            {(stats.downloadedPackagesCount ?? 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            ZIP & CSV bundles
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
            Pending Exports
          </span>
          <span className="text-lg font-bold text-amber-600 mt-1 block">
            {stats.pendingExportsCount ?? 0} Batches
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Ready for high-speed print
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
            Last Exported
          </span>
          <span className="text-xs font-bold text-brand-700 mt-1 block font-mono">
            BATCH-2026-001
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            100,000 units • Baddi Plant
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveNav('qr-codes')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Generate QR</span>
          </button>

          <button
            onClick={handleDownloadLatestPackage}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download ZIP</span>
          </button>
        </div>

        <button
          onClick={() => setActiveNav('qr-codes')}
          className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-600 pt-1"
        >
          <span>View Full QR Generation & Export History</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
