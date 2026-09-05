import React from 'react';
import { useDashboard } from '../Hooks/dashboard.hooks';
import { useToast } from '../../../context/ToastContext';
import { Batch } from '../../../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import {
  Eye,
  QrCode,
  AlertOctagon,
  ArrowRight,
  Database,
  Search,
} from 'lucide-react';

export const DashboardTable: React.FC = () => {
  const {
    batches,
    setSelectedBatch,
    navigateTo,
    setBatchToRecall,
    setIsRecallModalOpen,
  } = useDashboard();
  const { showToast } = useToast();

  const handleDownloadQR = (e: React.MouseEvent, batch: Batch) => {
    e.stopPropagation();
    showToast({
      type: 'info',
      title: 'Packaging GS1 DataMatrix Codes',
      message: `Exporting thermal label print package for ${batch.id}...`,
    });
  };

  const handleRecall = (e: React.MouseEvent, batch: Batch) => {
    e.stopPropagation();
    setBatchToRecall(batch);
    setIsRecallModalOpen(true);
  };

  return (
    <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Table Card Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[var(--bg-surface)]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Recent Production Batches</h3>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              Live Ledger Stream
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real-time batch lifecycle, cryptographic minting progress, and statutory verification status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('batches')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 transition-all cursor-pointer border border-cyan-500/20"
          >
            <span>View All Batches ({batches.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="table-scroll-container max-h-[480px] rounded-b-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 shadow-xs">
            <tr className="bg-[var(--bg-element)]/95 backdrop-blur-md border-b border-[var(--border)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <th className="px-4 py-3.5">Batch ID & Block</th>
              <th className="px-4 py-3.5">Medicine & Formulation</th>
              <th className="px-4 py-3.5">Mfg Date</th>
              <th className="px-4 py-3.5">Expiry Date</th>
              <th className="px-4 py-3.5 text-right">Batch Quantity</th>
              <th className="px-4 py-3.5 text-right">Minted QRs</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-xs">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Database className="w-8 h-8 text-[var(--text-muted)]/40" />
                    <p className="font-semibold text-sm">No production batches found</p>
                    <p className="text-xs">Create your first compliant batch to begin cryptographic serial tracking.</p>
                  </div>
                </td>
              </tr>
            ) : (
              batches.slice(0, 8).map((batch) => (
                <tr
                  key={batch.id}
                  onClick={() => {
                    setSelectedBatch(batch);
                    navigateTo('batch-detail');
                  }}
                  className="hover:bg-cyan-500/[0.04] cursor-pointer transition-colors group"
                >
                  {/* Batch ID */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors">
                        {batch.id}
                      </span>
                      {batch.blockNumber && (
                        <span className="text-[10px] text-cyan-700 dark:text-cyan-300 font-mono bg-cyan-500/10 dark:bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                          #{batch.blockNumber}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Medicine */}
                  <td className="px-4 py-3.5">
                    <div className="min-w-[180px]">
                      <div className="font-bold text-xs text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors truncate">
                        {batch.medicineName}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] font-medium truncate mt-0.5">
                        {batch.dosage} • {batch.form}
                      </div>
                    </div>
                  </td>

                  {/* Mfg Date */}
                  <td className="px-4 py-3.5 text-[var(--text-muted)] whitespace-nowrap font-mono text-[11px]">
                    {new Date(batch.manufacturingDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Expiry Date */}
                  <td className="px-4 py-3.5 text-[var(--text-muted)] whitespace-nowrap font-mono text-[11px]">
                    {new Date(batch.expiryDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Total Quantity */}
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">
                    {batch.totalQuantity.toLocaleString()}
                  </td>

                  {/* Packs Minted */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono font-bold">
                    {batch.packsMinted > 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {batch.packsMinted.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">0</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <StatusBadge status={batch.mintStatus} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBatch(batch);
                          navigateTo('batch-detail');
                        }}
                        title="Inspect Batch Details"
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {batch.mintStatus !== 'DRAFT' && batch.mintStatus !== 'MINTING' && (
                        <button
                          onClick={(e) => handleDownloadQR(e, batch)}
                          title="Download GS1 Print Package"
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {batch.mintStatus !== 'RECALLED' && (
                        <button
                          onClick={(e) => handleRecall(e, batch)}
                          title="Initiate Recall Notice"
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardTable;
