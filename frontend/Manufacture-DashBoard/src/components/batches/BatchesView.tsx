import React, { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import { Batch, BatchMintStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { DataTable, Column } from '../common/DataTable';
import {
  Layers,
  PlusCircle,
  Download,
  QrCode,
  Eye,
  AlertOctagon,
  FileSpreadsheet,
  Filter,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { TableSkeleton } from '../common/SkeletonLoader';

export const BatchesView: React.FC = () => {
  const {
    batches,
    loading,
    loadBatches,
    mintBatch,
    setSelectedBatch,
    setActiveNav,
    setBatchToRecall,
    setIsRecallModalOpen,
    downloadBatchCsv,
  } = useDashboard();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ALL' | BatchMintStatus>('ALL');
  const [selectedPlant, setSelectedPlant] = useState<string>('ALL');

  useEffect(() => {
    loadBatches().catch(() => {});
  }, [loadBatches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (activeTab !== 'ALL' && b.mintStatus !== activeTab) return false;
      if (selectedPlant !== 'ALL' && !b.productionSite.includes(selectedPlant)) return false;
      return true;
    });
  }, [batches, activeTab, selectedPlant]);

  const handleDownloadQR = (e: React.MouseEvent, batch: Batch) => {
    e.stopPropagation();
    setSelectedBatch(batch);
    setActiveNav('qr-codes');
  };

  const handleExportCSV = (e: React.MouseEvent, batch: Batch) => {
    e.stopPropagation();
    if (batch.mintStatus !== 'MINTED' && batch.mintStatus !== 'RECALLED') {
      showToast({
        type: 'warning',
        title: batch.mintStatus === 'FAILED' ? 'Batch Minting Failed' : 'Batch Minting In Progress',
        message: batch.mintStatus === 'FAILED'
          ? `Batch ${batch.id} failed minting (${batch.mintError || 'AWS S3 error'}). Please click the sparkle icon to retry minting.`
          : `Batch ${batch.id} is currently in "${batch.mintStatus}" status. The QR CSV manifest becomes available once cryptographic signing and S3 upload are complete.`,
      });
      return;
    }
    downloadBatchCsv(batch.id, 'packs');
  };

  const handleRecall = (e: React.MouseEvent, batch: Batch) => {
    e.stopPropagation();
    setBatchToRecall(batch);
    setIsRecallModalOpen(true);
  };

  const columns: Column<Batch>[] = [
    {
      key: 'id',
      header: 'Batch ID',
      sortable: true,
      render: (batch) => (
        <div>
          <span className="font-semibold text-emerald-500 dark:text-emerald-400 font-mono">{batch.id}</span>
          {batch.blockNumber && (
            <span className="block text-[10px] text-[var(--text-muted)] font-mono">
              Block #{batch.blockNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'medicineName',
      header: 'Medicine & Formulation',
      sortable: true,
      render: (batch) => (
        <div>
          <div className="font-semibold text-[var(--text-primary)]">{batch.medicineName}</div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {batch.genericName} • {batch.dosage}
          </div>
        </div>
      ),
    },
    {
      key: 'productionSite',
      header: 'Production Facility',
      sortable: true,
      render: (batch) => (
        <span className="text-[var(--text-muted)] truncate max-w-[160px] block">
          {batch.productionSite}
        </span>
      ),
    },
    {
      key: 'manufacturingDate',
      header: 'Mfg Date',
      sortable: true,
      render: (batch) => (
        <span className="text-[var(--text-muted)] whitespace-nowrap">
          {new Date(batch.manufacturingDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      sortable: true,
      render: (batch) => (
        <span className="text-[var(--text-muted)] whitespace-nowrap">
          {new Date(batch.expiryDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'totalQuantity',
      header: 'Units (Packs)',
      sortable: true,
      align: 'right',
      render: (batch) => (
        <div className="text-right">
          <span className="font-bold text-[var(--text-primary)]">
            {batch.totalQuantity.toLocaleString()}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block font-mono">
            ({batch.packsMinted.toLocaleString()} minted)
          </span>
        </div>
      ),
    },
    {
      key: 'mintStatus',
      header: 'Status',
      align: 'center',
      render: (batch) => (
        <div className="flex flex-col items-center gap-1">
          <StatusBadge status={batch.mintStatus} size="sm" />
          {batch.blockchainStatus === 'FAILED' && (
            <span
              className="text-[10px] text-amber-400 max-w-[140px] truncate font-bold cursor-help flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
              title={`Blockchain Desync: ${batch.blockchainError || 'Hyperledger Fabric commit failed. Inspect batch to retry.'}`}
            >
              ⚠️ Chain Desynced
            </span>
          )}
          {batch.mintError && (
            <span
              className="text-[10px] text-rose-500 max-w-[130px] truncate font-medium cursor-help"
              title={`Minting / S3 Error: ${batch.mintError}`}
            >
              {batch.mintError.includes('S3') ? '⚠️ S3 Storage Error' : '⚠️ Mint Error'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (batch) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBatch(batch);
              setActiveNav('batch-detail');
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-500 hover:bg-[var(--bg-element)] transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {(batch.mintStatus === 'PENDING' || batch.mintStatus === 'FAILED') && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await mintBatch(batch.id);
                  await loadBatches();
                } catch {}
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                batch.mintStatus === 'FAILED'
                  ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                  : 'text-amber-400 hover:text-emerald-400 hover:bg-[var(--bg-element)]'
              }`}
              title={
                batch.mintStatus === 'FAILED'
                  ? `Retry Minting to AWS S3 (Error: ${batch.mintError || 'Unknown'})`
                  : 'Mint Batch Now (Generate Cryptographic QRs & Upload to S3)'
              }
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </button>
          )}

          {batch.mintStatus !== 'DRAFT' && batch.mintStatus !== 'MINTING' && (
            <button
              onClick={(e) => handleDownloadQR(e, batch)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-500 hover:bg-[var(--bg-element)] transition-colors cursor-pointer"
              title="Download QR ZIP"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          )}

          {batch.mintStatus !== 'RECALLED' && (
            <button
              onClick={(e) => handleRecall(e, batch)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-element)] transition-colors cursor-pointer"
              title="Recall Batch"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <TableSkeleton rows={8} />;
  }

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Medicine Production Batches</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {batches.length} Registered Batches
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Complete inventory batches, blockchain minting state, and thermal QR export packages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveNav('create-batch')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Plant Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)]">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'ALL', label: 'All Batches', count: batches.length },
            { id: 'MINTED', label: 'Minted', count: batches.filter((b) => b.mintStatus === 'MINTED').length },
            { id: 'PACKAGED', label: 'Packaged', count: batches.filter((b) => b.mintStatus === 'PACKAGED').length },
            { id: 'DISTRIBUTED', label: 'Distributed', count: batches.filter((b) => b.mintStatus === 'DISTRIBUTED').length },
            { id: 'DRAFT', label: 'Draft', count: batches.filter((b) => b.mintStatus === 'DRAFT').length },
            { id: 'RECALLED', label: 'Recalled', count: batches.filter((b) => b.mintStatus === 'RECALLED').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-emerald-800 text-emerald-100' : 'bg-[var(--bg-element)] text-[var(--text-muted)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-element)] text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">All Manufacturing Plants</option>
            <option value="Baddi" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Baddi Unit 1 (FAC-HP-01)</option>
            <option value="Hyderabad" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Hyderabad Injectables (FAC-HYD-02)</option>
            <option value="Sikkim" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Sikkim Solid Dosage (FAC-SK-03)</option>
          </select>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        data={filteredBatches}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable={true}
        searchPlaceholder="Search by Batch ID, medicine name, formula..."
        searchFilter={(item, query) =>
          item.id.toLowerCase().includes(query) ||
          item.medicineName.toLowerCase().includes(query) ||
          item.genericName.toLowerCase().includes(query) ||
          item.productionSite.toLowerCase().includes(query)
        }
        pageSize={8}
        onRowClick={(item) => {
          setSelectedBatch(item);
          setActiveNav('batch-detail');
        }}
      />
    </div>
  );
};
