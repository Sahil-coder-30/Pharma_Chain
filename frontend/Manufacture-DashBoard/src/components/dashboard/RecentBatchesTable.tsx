import React, { useState } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import { Batch } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  Eye,
  Download,
  MoreVertical,
  QrCode,
  AlertOctagon,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const RecentBatchesTable: React.FC = () => {
  const { batches, setSelectedBatch, setActiveNav, navigateTo, setBatchToRecall, setIsRecallModalOpen } =
    useDashboard();
  const { showToast } = useToast();
  const [actionMenuBatchId, setActionMenuBatchId] = useState<string | null>(null);

  const handleDownloadQR = (e: React.MouseEvent, batch: Batch) => {
    e.stopPropagation();
    showToast({
      type: 'info',
      title: 'Preparing QR Package',
      message: `Packaging 100,000 high-resolution print QR codes for ${batch.id}...`,
    });
    setTimeout(() => {
      showToast({
        type: 'success',
        title: 'Package Ready',
        message: `${batch.id}_print_ready_qr.zip (${(batch.totalQuantity * 0.012).toFixed(1)} MB) downloaded.`,
      });
    }, 1000);
  };

  const handleDownloadCSV = (e: React.MouseEvent, batch: Batch) => {
    e.stopPropagation();
    showToast({
      type: 'success',
      title: 'CSV Manifest Generated',
      message: `${batch.id}_token_manifest.csv exported with serial ranges and pack hashes.`,
    });
  };

  const handleInitiateRecall = (e: React.MouseEvent, batch: Batch) => {
    e.stopPropagation();
    setBatchToRecall(batch);
    setIsRecallModalOpen(true);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Recent Batches</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Live Production Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time batch lifecycle, digital minting states and verification status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveNav('batches')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <span>View All Batches ({batches.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll-container max-h-[460px] rounded-b-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 shadow-xs">
            <tr className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="px-4 py-3">Batch ID</th>
              <th className="px-4 py-3">Medicine & Strength</th>
              <th className="px-4 py-3">Mfg Date</th>
              <th className="px-4 py-3">Expiry Date</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Packs Minted</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {batches.slice(0, 6).map((batch) => (
              <tr
                key={batch.id}
                onClick={() => {
                  setSelectedBatch(batch);
                  navigateTo('batch-detail');
                }}
                className="hover:bg-brand-50/40 cursor-pointer transition-colors group"
              >
                {/* Batch ID */}
                <td className="px-4 py-3.5 font-semibold text-brand-700 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>{batch.id}</span>
                    {batch.blockNumber && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        #{batch.blockNumber}
                      </span>
                    )}
                  </div>
                </td>

                {/* Medicine */}
                <td className="px-4 py-3.5 font-medium text-slate-900">
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                      {batch.medicineName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      {batch.dosage} • {batch.form}
                    </div>
                  </div>
                </td>

                {/* Mfg Date */}
                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                  {new Date(batch.manufacturingDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>

                {/* Expiry Date */}
                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                  {new Date(batch.expiryDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>

                {/* Total Quantity */}
                <td className="px-4 py-3.5 text-right font-medium text-slate-900 whitespace-nowrap">
                  {batch.totalQuantity.toLocaleString()}
                </td>

                {/* Packs Minted */}
                <td className="px-4 py-3.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {batch.packsMinted > 0 ? (
                    <span className="text-emerald-700">
                      {batch.packsMinted.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                  <StatusBadge status={batch.mintStatus} size="sm" />
                </td>

                {/* Created Date */}
                <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                  Today
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBatch(batch);
                        navigateTo('batch-detail');
                      }}
                      title="View end-to-end batch provenance & pack details"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {batch.mintStatus !== 'DRAFT' && batch.mintStatus !== 'MINTING' && (
                      <button
                        onClick={(e) => handleDownloadQR(e, batch)}
                        title="Download ZIP QR package"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {batch.mintStatus !== 'RECALLED' && (
                      <button
                        onClick={(e) => handleInitiateRecall(e, batch)}
                        title="Initiate Recall"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
