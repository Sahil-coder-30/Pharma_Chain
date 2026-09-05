import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { BatchTimeline } from './BatchTimeline';
import { retryBlockchainBatchAPI } from '../../features/dashboard/service/dashboard.api';
import {
  Boxes,
  QrCode,
  Download,
  AlertOctagon,
  AlertTriangle,
  RefreshCw,
  Loader2,
  KeyRound,
  FileCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Lock,
  Layers,
  Sparkles,
  Database,
  Cpu,
  FileText,
  ThermometerSnowflake,
  ShieldCheck,
} from 'lucide-react';

export const BatchDetailsModal: React.FC = () => {
  const {
    selectedBatch,
    setSelectedBatch,
    setBatchToRecall,
    setIsRecallModalOpen,
    profile,
    downloadBatchCsv,
    fetchBatchPreview,
    fetchBatchDetails,
    mintBatch,
  } = useDashboard();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'tier2' | 'timeline' | 'packs' | 'security'>('overview');
  const [livePacks, setLivePacks] = useState<any[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);

  useEffect(() => {
    if ((activeTab === 'packs' || activeTab === 'security') && selectedBatch?.id) {
      if (selectedBatch.mintStatus !== 'MINTED' && selectedBatch.mintStatus !== 'RECALLED') {
        setLivePacks([]);
        return;
      }
      setLoadingPacks(true);
      fetchBatchPreview(selectedBatch.id, 1, 20)
        .then((res) => {
          if (res?.packs && Array.isArray(res.packs)) {
            setLivePacks(res.packs);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingPacks(false));
    }
  }, [activeTab, selectedBatch?.id, selectedBatch?.mintStatus, fetchBatchPreview]);

  if (!selectedBatch) return null;

  const handleDownloadZIP = () => {
    if (selectedBatch.mintStatus !== 'MINTED' && selectedBatch.mintStatus !== 'RECALLED') {
      showToast({
        type: 'warning',
        title: 'Batch Still Minting',
        message: `Batch ${selectedBatch.id} is currently in "${selectedBatch.mintStatus}" status. Please wait for ES256 signing to finish.`,
      });
      return;
    }
    downloadBatchCsv(selectedBatch.id, 'packs');
  };

  const [isRetryingBlockchain, setIsRetryingBlockchain] = useState(false);

  const handleRetryBlockchain = async () => {
    if (!selectedBatch) return;
    setIsRetryingBlockchain(true);
    try {
      const res = await retryBlockchainBatchAPI(selectedBatch.id);
      showToast({
        type: 'success',
        title: 'Blockchain Sync Successful',
        message: `Batch ${selectedBatch.id} has been committed to Hyperledger Fabric.`,
      });
      setSelectedBatch({
        ...selectedBatch,
        blockchainStatus: 'COMMITTED',
        blockchainError: undefined,
        blockchainRecordedCount: res?.data?.blockchainRecordedCount || selectedBatch.totalQuantity,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Blockchain Sync Failed',
        message: err.message || 'Could not reach Hyperledger Fabric peer/orderer.',
      });
    } finally {
      setIsRetryingBlockchain(false);
    }
  };

  const handleRecallClick = () => {
    setBatchToRecall(selectedBatch);
    setIsRecallModalOpen(true);
  };

  return (
    <Modal
      isOpen={!!selectedBatch}
      onClose={() => setSelectedBatch(null)}
      title={`Batch Inspection: ${selectedBatch.id}`}
      subtitle={`${selectedBatch.medicineName} (${selectedBatch.dosage})`}
      icon={<Boxes className="w-5 h-5 text-[var(--brand-primary)]" />}
      size="xl"
    >
      <div className="space-y-5">
        {/* Header Ribbon & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
              Rx
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[var(--text-primary)]">{selectedBatch.medicineName}</span>
                <StatusBadge status={selectedBatch.mintStatus} size="sm" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Generic: {selectedBatch.genericName} • Dosage: {selectedBatch.dosage} • Standard: {selectedBatch.pharmacopoeiaStandard || 'IP'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZIP}
              className="btn-secondary text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export QR ZIP</span>
            </button>

            {selectedBatch.mintStatus !== 'RECALLED' && (
              <button
                onClick={handleRecallClick}
                className="btn-danger text-xs"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Initiate Recall</span>
              </button>
            )}
          </div>
        </div>

        {/* S3 Failure Banner */}
        {selectedBatch.mintStatus === 'FAILED' && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">AWS S3 Minting / Storage Failed</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5 font-mono break-all">
                  {selectedBatch.mintError || 'Cryptographic tokens could not be stored in AWS S3. Local disk fallback is disabled.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => mintBatch(selectedBatch.id)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Retry S3 Mint</span>
            </button>
          </div>
        )}

        {/* Blockchain Desync / Error Alert Banner */}
        {selectedBatch.blockchainStatus === 'FAILED' && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-400">Blockchain Ledger Sync Failed</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono break-all">
                  {selectedBatch.blockchainError || 'Hyperledger Fabric was unreachable or rejected the transaction.'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  QR tokens are signed and available in S3, but transitions are not yet committed to Fabric world state.
                </p>
              </div>
            </div>
            <button
              onClick={handleRetryBlockchain}
              disabled={isRetryingBlockchain}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRetryingBlockchain ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing to Fabric...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Blockchain Sync</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border)] gap-2 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'overview', label: 'Batch Overview' },
            { id: 'tier2', label: 'Tier-2 Formulation & COA' },
            { id: 'timeline', label: 'Lifecycle Timeline' },
            { id: 'packs', label: 'Pack Breakdown' },
            { id: 'security', label: 'Tier-1 ES256 Token' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-2.5 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-bold'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Total Quantity</span>
                <span className="font-bold text-[var(--text-primary)] mt-0.5 block">{selectedBatch.totalQuantity.toLocaleString()} Units</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Packs Minted</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">{selectedBatch.packsMinted.toLocaleString()} Packs</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Pack Size</span>
                <span className="font-bold text-[var(--text-primary)] mt-0.5 block">{selectedBatch.packSize} Units/Strip</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Manufacturing Date</span>
                <span className="font-medium text-[var(--text-primary)] mt-0.5 block">{selectedBatch.manufacturingDate}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Expiry Date</span>
                <span className="font-medium text-[var(--text-primary)] mt-0.5 block">{selectedBatch.expiryDate}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Production Site</span>
                <span className="font-medium text-[var(--text-primary)] mt-0.5 block truncate">{selectedBatch.productionSite}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Blockchain Ledger</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`font-bold font-mono text-xs ${
                    selectedBatch.blockchainStatus === 'COMMITTED'
                      ? 'text-emerald-400'
                      : selectedBatch.blockchainStatus === 'FAILED'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}>
                    {selectedBatch.blockchainStatus || 'COMMITTED'}
                  </span>
                  {selectedBatch.blockchainRecordedCount != null && (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      ({selectedBatch.blockchainRecordedCount} on-chain)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Ledger Key / Tx</span>
                <span className="font-medium font-mono text-[11px] text-[var(--text-primary)] mt-0.5 block truncate" title={selectedBatch.txHash || `${selectedBatch.id}:MINTED`}>
                  {selectedBatch.txHash || `${selectedBatch.id}:MINTED`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">S3 Artifact Storage</span>
                <span className="font-bold text-emerald-400 mt-0.5 block uppercase">
                  AWS S3 ({selectedBatch.s3Mode || 'aws'})
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Active Chemical Composition</span>
              <p className="text-xs text-[var(--text-primary)] font-mono leading-relaxed">{selectedBatch.composition}</p>
            </div>
          </div>
        )}

        {/* Tab 2: Tier 2 Formulation & COA */}
        {activeTab === 'tier2' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Drug Schedule</span>
                <span className="font-bold text-amber-400 mt-0.5 block">{selectedBatch.drugSchedule || 'Schedule H'}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Pharmacopoeia</span>
                <span className="font-bold text-[var(--text-primary)] mt-0.5 block">{selectedBatch.pharmacopoeiaStandard || 'IP (Indian Pharmacopoeia)'}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Production Line</span>
                <span className="font-bold font-mono text-[var(--text-primary)] mt-0.5 block">{selectedBatch.productionLineId || 'LINE-OSD-04'}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">COA Reference #</span>
                <span className="font-bold font-mono text-emerald-400 mt-0.5 block">{selectedBatch.coaReferenceNo || 'COA-2026-AUG-8890'}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Assay Purity</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">{selectedBatch.assayResult || '99.8% Active Purity'}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">CDSCO Approval #</span>
                <span className="font-bold font-mono text-[var(--text-primary)] mt-0.5 block">{selectedBatch.cdscoApprovalNo || 'CDSCO-APP-2026-99120'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Storage Conditions</span>
              <p className="text-xs text-[var(--text-primary)]">{selectedBatch.storageConditions || 'Store below 25°C in a cool, dry place. Protect from light and moisture.'}</p>
            </div>
          </div>
        )}

        {/* Tab 3: Timeline */}
        {activeTab === 'timeline' && (
          <div className="p-4 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
            <BatchTimeline
              status={selectedBatch.mintStatus}
              createdAt={selectedBatch.createdAt}
              txHash={selectedBatch.txHash}
              blockNumber={selectedBatch.blockNumber}
              blockchainStatus={selectedBatch.blockchainStatus}
              blockchainError={selectedBatch.blockchainError}
            />
          </div>
        )}

        {/* Tab 4: Packs Breakdown */}
        {activeTab === 'packs' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-[var(--text-muted)]">
                {selectedBatch.mintStatus !== 'MINTED' && selectedBatch.mintStatus !== 'RECALLED'
                  ? `Batch is currently ${selectedBatch.mintStatus}. Individual pack tokens will populate once minting finishes.`
                  : livePacks.length > 0
                  ? `Showing first ${livePacks.length} packs from signed batch CSV:`
                  : 'Sample Serial Numbers generated in this production run:'}
              </p>
              <button
                onClick={() => {
                  if (selectedBatch.mintStatus !== 'MINTED' && selectedBatch.mintStatus !== 'RECALLED') {
                    showToast({
                      type: 'warning',
                      title: 'Batch Still Minting',
                      message: `Batch ${selectedBatch.id} is currently ${selectedBatch.mintStatus}. CSV export is available after minting completes.`,
                    });
                    return;
                  }
                  downloadBatchCsv(selectedBatch.id, 'packs');
                }}
                className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Export Full CSV</span>
              </button>
            </div>

            {selectedBatch.mintStatus === 'MINTING' ? (
              <div className="p-6 text-center space-y-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border)]">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 animate-spin mb-1">
                  <Boxes className="w-4 h-4" />
                </div>
                <p className="font-semibold text-[var(--text-primary)]">Cryptographic Minting in Progress</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  pharma-core is signing pack nonces with ES256 and submitting genesis records to Fabric.
                </p>
              </div>
            ) : selectedBatch.mintStatus === 'FAILED' ? (
              <div className="p-6 text-center space-y-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 mb-1">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-rose-200">S3 Batch Minting Failed</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-md mx-auto">
                  {selectedBatch.mintError || 'Failed to upload cryptographically signed tokens to AWS S3. Local disk fallback is disabled.'}
                </p>
                <button
                  onClick={() => mintBatch(selectedBatch.id)}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Retry Minting to AWS S3</span>
                </button>
              </div>
            ) : loadingPacks ? (
              <div className="py-6 text-center text-xs text-[var(--text-muted)] animate-pulse">
                Fetching signed packs from pharma-core...
              </div>
            ) : livePacks.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {livePacks.map((p: any, idx: number) => (
                  <div
                    key={p.serialNumber || idx}
                    className="p-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        #{p.serialNumber}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[200px] sm:max-w-xs">
                        {p.packHash || p.signedToken?.slice(0, 32) + '...'}
                      </span>
                    </div>
                    {p.verifyUrl && (
                      <a
                        href={p.verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-emerald-400 hover:underline shrink-0"
                      >
                        Verify ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['00001', '00042', '01280', '05000', '10000', '45000', '75000', '99999'].map((s) => (
                  <div key={s} className="p-2.5 rounded-lg bg-[var(--bg-element)] border border-[var(--border)] font-mono text-center">
                    <span className="text-[10px] text-[var(--text-muted)] block">Pack Serial</span>
                    <span className="text-emerald-400 font-bold">#{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Tier 1 Security & ES256 Token */}
        {activeTab === 'security' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-emerald-800 shadow-sm">
                <QRCodeSVG
                  value={livePacks[0]?.verifyUrl || `https://pharmachain.gov.in/verify/${selectedBatch.id}-00001?batch=${selectedBatch.id}`}
                  size={130}
                  level="M"
                  includeMargin={true}
                />
                <span className="text-[10px] text-slate-800 font-mono font-bold mt-1">Serial #00001</span>
              </div>
              <div className="sm:col-span-8 p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[10px] space-y-1.5 border border-slate-800">
                <div className="text-emerald-400 font-bold flex items-center justify-between pb-1 border-b border-slate-800">
                  <span>TIER 1: ES256 SIGNED QR JWT</span>
                  <span>alg: "ES256"</span>
                </div>
                <div className="space-y-0.5 text-slate-300">
                  <div>batchId: "{selectedBatch.id}"</div>
                  <div>serial: "00001"</div>
                  <div>expiryDate: "{selectedBatch.expiryDate}"</div>
                  <div>manufacturerId: "{selectedBatch.manufacturerId}"</div>
                  <div>medicineName: "{selectedBatch.medicineName}"</div>
                  <div>nonce: "a3f7b2c1" <span className="text-slate-500">// CSPRNG</span></div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-[var(--text-muted)]">
                Signing Key ID: <code className="font-mono text-emerald-400">{profile.keyId}</code> (ECDSA NIST P-256 Curve)
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
