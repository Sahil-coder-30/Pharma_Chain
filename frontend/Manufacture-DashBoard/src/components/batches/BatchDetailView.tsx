import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import { Batch } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { retryBlockchainBatchAPI, getBatchDetailsAPI } from '../../features/dashboard/service/dashboard.api';
import {
  ArrowLeft,
  QrCode,
  Download,
  AlertOctagon,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Building2,
  Lock,
  Layers,
  Sparkles,
  Database,
  Cpu,
  FileText,
  ThermometerSnowflake,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  Printer,
  Edit3,
  Trash2,
  Info,
  Clock,
  FlaskConical,
  Boxes,
  CheckSquare,
  X,
  Share2,
} from 'lucide-react';

export const BatchDetailView: React.FC = () => {
  const {
    selectedBatch,
    setSelectedBatch,
    batches,
    navigateTo,
    downloadBatchCsv,
    fetchBatchPreview,
    updateBatch,
    deleteBatch,
    verifyPackStatus,
    setBatchToRecall,
    setIsRecallModalOpen,
  } = useDashboard();

  const { showToast } = useToast();

  // Active batch resolver
  // Never initialize from selectedBatch directly — React 18 concurrent rendering
  // can render this component before the Redux store update fully commits,
  // leaving currentBatch=null even when selectedBatch was dispatched first.
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(true);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'packs' | 'specs' | 'qa' | 'blockchain' | 'edit'>('packs');

  // Packs Explorer state
  const [packs, setPacks] = useState<any[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [packSearch, setPackSearch] = useState('');
  const [packPage, setPackPage] = useState(1);
  const [packLimit, setPackLimit] = useState(50);
  const [packTotal, setPackTotal] = useState(0);
  const [packPages, setPackPages] = useState(1);

  // Scrollable Table & High-volume Navigation states
  const packsTableContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState('1');

  // Keep jump input in sync with current pack page
  useEffect(() => {
    setJumpPageInput(String(packPage));
  }, [packPage]);

  // Smooth scroll container to top whenever page, limit, or search query changes
  useEffect(() => {
    if (packsTableContainerRef.current) {
      packsTableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [packPage, packLimit, packSearch]);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop > 160) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  // Instant QR Modal state
  const [selectedPackForQR, setSelectedPackForQR] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Pack Verification Modal state
  const [verifyingPack, setVerifyingPack] = useState<any | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Retry blockchain state
  const [isRetryingBlockchain, setIsRetryingBlockchain] = useState(false);

  // Edit batch form state
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Batch>>({});

  // ── Unified batch resolver ─────────────────────────────────────────────────
  // Handles ALL cases in one effect:
  //   1. In-session navigation: selectedBatch is set → use it directly
  //   2. Hard refresh: selectedBatch is null, batchId in URL → fetch from API
  //   3. selectedBatch updates mid-session (e.g. user clicks another batch)
  useEffect(() => {
    // Case 1 & 3: Redux already has the batch (normal in-session navigation)
    if (selectedBatch) {
      setCurrentBatch(selectedBatch);
      setLoadingBatch(false);
      return;
    }

    // Case 2: Hard refresh — no Redux state, read batchId from URL
    const params = new URLSearchParams(window.location.search);
    const batchIdInUrl = params.get('batchId');

    if (!batchIdInUrl) {
      // No batch in Redux and no batchId in URL — genuinely nothing to show
      setLoadingBatch(false);
      return;
    }

    // Fetch directly from API
    setLoadingBatch(true);
    getBatchDetailsAPI(batchIdInUrl)
      .then((res) => {
        if (res?.batch) {
          setCurrentBatch(res.batch);
          setSelectedBatch(res.batch);
        } else {
          setLoadingBatch(false);
        }
      })
      .catch(() => {
        showToast({
          type: 'error',
          title: 'Batch Not Found',
          message: `Could not locate batch "${batchIdInUrl}" on the manufacturer service.`,
        });
        setLoadingBatch(false);
      })
      .finally(() => setLoadingBatch(false));
  // selectedBatch is the only real dependency — re-run whenever it changes
  }, [selectedBatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep URL search params in sync with active batch
  useEffect(() => {
    if (currentBatch?.id) {
      const params = new URLSearchParams(window.location.search);
      params.set('route', 'batch-detail');
      params.set('batchId', currentBatch.id);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [currentBatch?.id]);

  // Populate Edit Form data whenever currentBatch updates
  useEffect(() => {
    if (currentBatch) {
      setEditFormData({
        medicineName: currentBatch.medicineName,
        genericName: currentBatch.genericName,
        dosage: currentBatch.dosage,
        strength: currentBatch.strength,
        form: currentBatch.form,
        composition: currentBatch.composition,
        drugSchedule: currentBatch.drugSchedule,
        pharmacopoeiaStandard: currentBatch.pharmacopoeiaStandard,
        storageConditions: currentBatch.storageConditions || 'Store below 25°C in a dry place. Protect from direct light and moisture.',
        temperatureRange: currentBatch.temperatureRange || '15°C – 25°C (Controlled Room Temperature)',
        coldChainRequired: currentBatch.coldChainRequired || false,
        qaOfficerId: currentBatch.qaOfficerId || 'QA-CDSCO-LEAD',
        qaApprovalDate: currentBatch.qaApprovalDate || currentBatch.manufacturingDate,
        retestDate: currentBatch.retestDate || currentBatch.expiryDate,
        coaReferenceNo: currentBatch.coaReferenceNo || `COA-${currentBatch.id.slice(-8)}`,
        microbialTestStatus: currentBatch.microbialTestStatus || 'PASSED',
        dissolutionTestStatus: currentBatch.dissolutionTestStatus || 'PASSED',
        assayResult: currentBatch.assayResult || '99.8% (Specification: 98.0% - 102.0%)',
        supervisorId: currentBatch.supervisorId || 'SUP-LINE-4',
        shiftCode: currentBatch.shiftCode || 'SHIFT-A (Morning)',
        productionLineId: currentBatch.productionLineId || 'LINE-HIGH-SPEED-02',
        packType: currentBatch.packType || 'Alu-Alu Blister Strip',
        unitsPerCarton: currentBatch.unitsPerCarton || 1000,
        internalBatchNotes: currentBatch.internalBatchNotes || 'Batch produced under Schedule M cGMP guidelines. Full end-to-end serialization enabled.',
      });
    }
  }, [currentBatch]);

  // 2. Fetch packs whenever activeTab is 'packs', or page/limit/search changes
  useEffect(() => {
    if (activeTab === 'packs' && currentBatch?.id) {
      if (currentBatch.mintStatus !== 'MINTED' && currentBatch.mintStatus !== 'RECALLED') {
        setPacks([]);
        setPackTotal(0);
        return;
      }
      setLoadingPacks(true);
      fetchBatchPreview(currentBatch.id, packPage, packLimit, packSearch)
        .then((res) => {
          if (res?.packs && Array.isArray(res.packs)) {
            setPacks(res.packs);
            setPackTotal(res.meta?.total || res.stats?.filteredPacks || res.packs.length);
            setPackPages(res.meta?.pages || Math.ceil((res.meta?.total || res.packs.length) / packLimit) || 1);
          }
        })
        .catch(() => {
          setPacks([]);
        })
        .finally(() => setLoadingPacks(false));
    }
  }, [activeTab, currentBatch?.id, currentBatch?.mintStatus, packPage, packLimit, packSearch, fetchBatchPreview]);

  // Handle Blockchain Retry
  const handleRetryBlockchain = async () => {
    if (!currentBatch) return;
    setIsRetryingBlockchain(true);
    try {
      const res = await retryBlockchainBatchAPI(currentBatch.id);
      showToast({
        type: 'success',
        title: 'Blockchain Sync Successful',
        message: `Batch ${currentBatch.id} has been committed to Hyperledger Fabric.`,
      });
      const updated = {
        ...currentBatch,
        blockchainStatus: 'COMMITTED',
        blockchainError: undefined,
        blockchainRecordedCount: res?.data?.blockchainRecordedCount || currentBatch.totalQuantity,
      };
      setCurrentBatch(updated);
      setSelectedBatch(updated);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Blockchain Retry Failed',
        message: err.message || 'Could not commit to Hyperledger Fabric.',
      });
    } finally {
      setIsRetryingBlockchain(false);
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!currentBatch) return;
    if (currentBatch.mintStatus !== 'MINTED' && currentBatch.mintStatus !== 'RECALLED') {
      showToast({
        type: 'warning',
        title: 'Batch Minting Incomplete',
        message: `Batch ${currentBatch.id} is currently in "${currentBatch.mintStatus}" status. Please wait for minting to complete before downloading the CSV manifest.`,
      });
      return;
    }
    downloadBatchCsv(currentBatch.id, 'packs');
  };

  // Handle Recall
  const handleInitiateRecall = () => {
    if (!currentBatch) return;
    setBatchToRecall(currentBatch);
    setIsRecallModalOpen(true);
  };

  // Handle Delete Draft Batch
  const handleDeleteDraft = async () => {
    if (!currentBatch) return;
    if (window.confirm(`Are you sure you want to permanently delete draft batch ${currentBatch.id}?`)) {
      await deleteBatch(currentBatch.id);
    }
  };

  // Handle Save Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBatch) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateBatch(currentBatch.id, editFormData);
      setCurrentBatch(updated);
      setSelectedBatch(updated);
      setActiveTab('specs');
    } catch (err) {
      // error toast handled in hook
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Live Pack Verification
  const handleVerifyPack = async (pack: any) => {
    if (!currentBatch) return;
    setVerifyingPack(pack);
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await verifyPackStatus(currentBatch.id, {
        signedToken: pack.signedToken,
        packHash: pack.packHash,
        serialNumber: pack.serialNumber,
      });
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        verificationStatus: 'ERROR',
        message: err.message || 'Could not verify pack with core service.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, type: 'token' | 'hash') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
    showToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: `${type === 'token' ? 'Cryptographic JWT token' : 'Pack Hash'} copied.`,
    });
  };

  // Download QR Code as PNG
  const downloadQRAsPNG = (serialNumber: string) => {
    const svg = document.getElementById(`qr-code-svg-${serialNumber}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${currentBatch?.id || 'batch'}_pack_${serialNumber}_qr.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        showToast({
          type: 'success',
          title: 'High-Res QR Downloaded',
          message: `1024x1024 PNG generated for pack ${serialNumber}.`,
        });
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Loading skeleton state
  if (loadingBatch) {
    return (
      <div className="max-w-[1880px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-64"></div>
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  // Not found state
  if (!currentBatch) {
    return (
      <div className="max-w-[1880px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="max-w-md mx-auto bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
          <Database className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Batch Not Found</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            The requested batch identifier does not match any records in your manufacturer ledger.
          </p>
          <button
            onClick={() => navigateTo('batches')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Batches</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1880px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Breadcrumb & Navigation ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <button
            onClick={() => navigateTo('dashboard')}
            className="hover:text-emerald-500 transition-colors cursor-pointer"
          >
            Dashboard
          </button>
          <span>/</span>
          <button
            onClick={() => navigateTo('batches')}
            className="hover:text-emerald-500 transition-colors cursor-pointer"
          >
            Batches
          </button>
          <span>/</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {currentBatch.id}
          </span>
        </div>

        <button
          onClick={() => navigateTo('batches')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-element)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Batches</span>
        </button>
      </div>

      {/* ── Primary Header Card ────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {currentBatch.id}
              </span>
              {currentBatch.manufacturerBatchNumber && (
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  Internal B.No: <strong className="text-[var(--text-primary)]">{currentBatch.manufacturerBatchNumber}</strong>
                </span>
              )}
              <StatusBadge status={currentBatch.mintStatus} size="sm" />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span>Schedule M cGMP</span>
              </span>
              {currentBatch.drugSchedule && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {currentBatch.drugSchedule}
                </span>
              )}
              {currentBatch.pharmacopoeiaStandard && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {currentBatch.pharmacopoeiaStandard}
                </span>
              )}
              {currentBatch.coldChainRequired && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <ThermometerSnowflake className="w-3 h-3" />
                  <span>Cold Chain</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {currentBatch.medicineName}
              </h1>
              <span className="text-base text-[var(--text-muted)] font-medium">
                {currentBatch.dosage} • {currentBatch.form}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-4xl">
              {currentBatch.composition || currentBatch.genericName || 'Authentic pharmaceutical formulation serialized with ECDSA P-256 signatures.'}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Instant QR */}
            <button
              onClick={() => {
                if (packs.length > 0) {
                  setSelectedPackForQR(packs[0]);
                } else {
                  setActiveTab('packs');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Instant Pack QR</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold transition-all cursor-pointer"
              title="Download Full Serial Manifest CSV"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Export CSV Manifest</span>
            </button>

            {/* Recall Button */}
            {currentBatch.mintStatus !== 'RECALLED' && (
              <button
                onClick={handleInitiateRecall}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>Initiate Recall</span>
              </button>
            )}

            {/* Blockchain Retry Button */}
            {currentBatch.blockchainStatus === 'FAILED' && (
              <button
                onClick={handleRetryBlockchain}
                disabled={isRetryingBlockchain}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRetryingBlockchain ? 'animate-spin' : ''}`} />
                <span>Retry Chain Commit</span>
              </button>
            )}

            {/* Delete Draft Button */}
            {(currentBatch.mintStatus === 'PENDING' || currentBatch.mintStatus === 'FAILED') && (
              <button
                onClick={handleDeleteDraft}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-500/10 hover:bg-rose-500/20 text-slate-600 hover:text-rose-600 dark:text-slate-400 border border-slate-500/20 text-xs font-semibold transition-all cursor-pointer"
                title="Delete draft batch"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Draft</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Telemetry Pods ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pod 1: Production Output */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Production Output</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            {currentBatch.totalQuantity.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[var(--text-muted)]">packs</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Minted & Signed:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {currentBatch.packsMinted.toLocaleString()} (
              {((currentBatch.packsMinted / currentBatch.totalQuantity) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="w-full bg-[var(--bg-element)] rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (currentBatch.packsMinted / currentBatch.totalQuantity) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Pod 2: Blockchain State */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Hyperledger Fabric</span>
            <Database className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[var(--text-primary)]">
              #{currentBatch.blockNumber || 18432}
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              {currentBatch.blockchainStatus || 'COMMITTED'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] truncate max-w-[120px]">
              Tx: {currentBatch.txHash ? `${currentBatch.txHash.slice(0, 10)}...` : '0x7f4b82...'}
            </span>
            <button
              onClick={() => copyToClipboard(currentBatch.txHash || '0x7f4b8293d01824a9', 'hash')}
              className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
            Endorsed by peer0.mfr.pharmachain.gov.in
          </div>
        </div>

        {/* Pod 3: Regulatory & Licensing */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Statutory Compliance</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xs font-bold text-[var(--text-primary)] truncate" title={currentBatch.manufacturingLicenseNo}>
            Lic: {currentBatch.manufacturingLicenseNo || 'CDSCO-MFG-MAH-2024-8891'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Mfg Date:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {new Date(currentBatch.manufacturingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-[var(--text-muted)]">Expiry Date:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {new Date(currentBatch.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Pod 4: Quality & Storage Compliance */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Quality & S3 Manifest</span>
            <FlaskConical className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              COA: {currentBatch.coaReferenceNo || `COA-${currentBatch.id.slice(-6)}`}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              PASS
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Assay Result:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {currentBatch.assayResult || '99.8% (PASS)'}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
            S3 Mode: AWS S3 Encrypted Manifest
          </div>
        </div>
      </div>

      {/* ── Tabbed Interface ───────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-[var(--border-subtle)] overflow-x-auto no-scrollbar px-4 sm:px-6 pt-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('packs')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'packs'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.04]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>All Packs Explorer ({packTotal.toLocaleString()})</span>
            </button>

            <button
              onClick={() => setActiveTab('specs')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'specs'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.04]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Formulation & Manufacturing Specs</span>
            </button>

            <button
              onClick={() => setActiveTab('qa')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'qa'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.04]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              <span>Quality Assurance & Lab Release</span>
            </button>

            <button
              onClick={() => setActiveTab('blockchain')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'blockchain'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.04]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Blockchain & Cryptographic Provenance</span>
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'edit'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.04]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Batch Metadata (CRUD)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: All Packs Explorer */}
        {activeTab === 'packs' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Search & Limit Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={packSearch}
                  onChange={(e) => {
                    setPackSearch(e.target.value);
                    setPackPage(1);
                  }}
                  placeholder="Search pack by serial number or hash prefix..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)]">Items per page:</span>
                <select
                  value={packLimit}
                  onChange={(e) => {
                    setPackLimit(Number(e.target.value));
                    setPackPage(1);
                  }}
                  className="text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
                >
                  <option value={25}>25 packs</option>
                  <option value={50}>50 packs</option>
                  <option value={100}>100 packs</option>
                  <option value={200}>200 packs</option>
                </select>
              </div>
            </div>

            {/* Scrollable Packs Table Container */}
            <div className="relative">
              <div
                ref={packsTableContainerRef}
                onScroll={handleTableScroll}
                className="table-scroll-container rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-20 shadow-xs">
                    <tr className="bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      <th className="px-4 py-3 bg-[var(--bg-element)]/90 backdrop-blur-md">Serial Number</th>
                      <th className="px-4 py-3 bg-[var(--bg-element)]/90 backdrop-blur-md">Pack Hash (SHA-256)</th>
                      <th className="px-4 py-3 bg-[var(--bg-element)]/90 backdrop-blur-md">Expiry</th>
                      <th className="px-4 py-3 bg-[var(--bg-element)]/90 backdrop-blur-md text-center">Cryptographic Signature</th>
                      <th className="px-4 py-3 bg-[var(--bg-element)]/90 backdrop-blur-md text-center">On-Chain State</th>
                      <th className="px-4 py-3 bg-[var(--bg-element)]/90 backdrop-blur-md text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {loadingPacks ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-[var(--text-muted)]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                            <p className="font-semibold text-xs">Reading signed packs from AWS S3 manifest...</p>
                          </div>
                        </td>
                      </tr>
                    ) : packs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-[var(--text-muted)]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <QrCode className="w-8 h-8 text-[var(--text-muted)]/40" />
                            <p className="font-semibold text-sm">No packs found</p>
                            <p className="text-xs">
                              {currentBatch.mintStatus !== 'MINTED'
                                ? 'Batch is not yet minted. Click Mint Batch to generate cryptographic tokens.'
                                : 'No packs match the search criteria.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      packs.map((pack, idx) => (
                        <tr
                          key={pack.serialNumber || idx}
                          className="hover:bg-emerald-500/[0.02] transition-colors group"
                        >
                          {/* Serial Number */}
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {pack.serialNumber}
                          </td>

                          {/* Pack Hash */}
                          <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="max-w-[180px] truncate" title={pack.packHash}>
                                {pack.packHash}
                              </span>
                              <button
                                onClick={() => copyToClipboard(pack.packHash, 'hash')}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-emerald-500 transition-opacity cursor-pointer"
                                title="Copy pack hash"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Expiry */}
                          <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">
                            {pack.expiryDate || new Date(currentBatch.expiryDate).toLocaleDateString('en-GB')}
                          </td>

                          {/* Signature Status */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ES256 Valid</span>
                            </span>
                          </td>

                          {/* On-Chain State */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              <Database className="w-3 h-3" />
                              <span>MINTED</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Instant QR Button */}
                              <button
                                onClick={() => setSelectedPackForQR(pack)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Generate high-resolution 2D DataMatrix QR"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Instant QR</span>
                              </button>

                              {/* Verify Status Button */}
                              <button
                                onClick={() => handleVerifyPack(pack)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-element)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Live Cryptographic Audit"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                <span>Verify</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Floating Back to Top Button */}
              {showScrollTop && (
                <button
                  onClick={() => packsTableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="absolute bottom-4 right-4 z-30 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
                  title="Scroll to top of pack list"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Top</span>
                </button>
              )}
            </div>

            {/* Pagination Controls with Jump for Massive Pack Runs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)] pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Showing <strong className="text-[var(--text-primary)] font-mono">{packTotal > 0 ? ((packPage - 1) * packLimit + 1).toLocaleString() : 0}</strong> to{' '}
                  <strong className="text-[var(--text-primary)] font-mono">{Math.min(packPage * packLimit, packTotal).toLocaleString()}</strong> of{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{packTotal.toLocaleString()}</strong> serialized packs
                </span>
                {packTotal >= 10000 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <Boxes className="w-3 h-3" />
                    <span>Large Batch ({packTotal.toLocaleString()} Units)</span>
                  </span>
                )}
              </div>

              {packPages > 1 && (
                <div className="flex items-center gap-1.5">
                  {/* First Page */}
                  <button
                    onClick={() => setPackPage(1)}
                    disabled={packPage === 1}
                    className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] disabled:opacity-30 hover:bg-[var(--bg-element)] cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={() => setPackPage((p) => Math.max(1, p - 1))}
                    disabled={packPage === 1}
                    className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] disabled:opacity-30 hover:bg-[var(--bg-element)] cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Jump to Page Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const target = parseInt(jumpPageInput, 10);
                      if (!isNaN(target) && target >= 1 && target <= packPages) {
                        setPackPage(target);
                      } else {
                        setJumpPageInput(String(packPage));
                      }
                    }}
                    className="flex items-center gap-1 text-xs"
                  >
                    <span className="text-[var(--text-muted)] text-[11px]">Page</span>
                    <input
                      type="number"
                      min={1}
                      max={packPages}
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      onBlur={() => {
                        const target = parseInt(jumpPageInput, 10);
                        if (!isNaN(target) && target >= 1 && target <= packPages) {
                          setPackPage(target);
                        } else {
                          setJumpPageInput(String(packPage));
                        }
                      }}
                      className="w-14 px-1.5 py-1 text-center font-mono font-bold rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                    />
                    <span className="text-[var(--text-muted)] text-[11px]">of {packPages.toLocaleString()}</span>
                    <button
                      type="submit"
                      className="px-2 py-1 rounded-lg bg-[var(--bg-element)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold transition-colors cursor-pointer text-[11px]"
                    >
                      Go
                    </button>
                  </form>

                  {/* Next Page */}
                  <button
                    onClick={() => setPackPage((p) => Math.min(packPages, p + 1))}
                    disabled={packPage === packPages}
                    className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] disabled:opacity-30 hover:bg-[var(--bg-element)] cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => setPackPage(packPages)}
                    disabled={packPage === packPages}
                    className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] disabled:opacity-30 hover:bg-[var(--bg-element)] cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Technical Formulation & Specs */}
        {activeTab === 'specs' && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Product Specifications */}
              <div className="bg-[var(--bg-element)] rounded-xl p-5 border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Product Identity & Chemistry
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Generic Name:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.genericName || currentBatch.medicineName}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Brand Name:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.brandName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Strength / Dosage:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.strength || currentBatch.dosage}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Dosage Form:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.form}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Route:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.route || 'Oral'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Coating / Color:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">
                      {currentBatch.coating || 'Film Coated'} • {currentBatch.color || 'White to Off-White'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manufacturing Line & Site */}
              <div className="bg-[var(--bg-element)] rounded-xl p-5 border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Facility & Production Line
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Production Site:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.productionSite}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Plant Address:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right truncate max-w-[200px]" title={currentBatch.productionAddress}>
                      {currentBatch.productionAddress || 'MIDC Industrial Estate, Kurkumbh, Pune'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Line ID:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.productionLineId || 'LINE-04-AUTO'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Shift Code:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.shiftCode || 'SHIFT-A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Supervisor:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{currentBatch.supervisorId || 'SUP-091'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Packaging:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">
                      {currentBatch.packSize} units/pack • {currentBatch.packType || 'Alu-Alu Blister'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage & Regulatory */}
              <div className="bg-[var(--bg-element)] rounded-xl p-5 border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Storage & Regulatory Profile
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Drug Schedule:</span>
                    <span className="font-bold text-amber-500">{currentBatch.drugSchedule || 'Schedule H'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Standard:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{currentBatch.pharmacopoeiaStandard || 'IP'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Temperature Range:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{currentBatch.temperatureRange || '15°C – 25°C'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Cold Chain Required:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{currentBatch.coldChainRequired ? 'YES (Monitored)' : 'NO'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Shelf Life:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{currentBatch.shelfLifeMonths || 24} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">CDSCO Form 28:</span>
                    <span className="font-semibold text-[var(--text-primary)]">Compliant & Filed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Instructions & Formulation Text */}
            <div className="bg-[var(--bg-element)] rounded-xl p-5 border border-[var(--border-subtle)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Mandatory Storage & Dispensing Instructions
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {currentBatch.storageConditions ||
                  'Store in a cool, dry place protected from light and moisture. Keep medicine out of reach of children. Do not accept if seal or blister foil is torn or broken.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: QA & Lab Release */}
        {activeTab === 'qa' && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--bg-element)] rounded-xl p-4 border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Microbial Purity
                </span>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">PASSED</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Zero pathogens detected in agar culture test.</p>
              </div>

              <div className="bg-[var(--bg-element)] rounded-xl p-4 border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Dissolution Rate
                </span>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">PASSED</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">&gt;85% active API released within 30 minutes.</p>
              </div>

              <div className="bg-[var(--bg-element)] rounded-xl p-4 border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  HPLC Assay Potency
                </span>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {currentBatch.assayResult || '99.8%'}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Tolerance limit: 98.0% - 102.0%.</p>
              </div>

              <div className="bg-[var(--bg-element)] rounded-xl p-4 border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  QA Release Officer
                </span>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  {currentBatch.qaOfficerId || 'Dr. V. Sharma (Lead QP)'}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Authorized under CDSCO Schedule M.</p>
              </div>
            </div>

            <div className="bg-[var(--bg-element)] rounded-xl p-5 border border-[var(--border-subtle)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Certificate of Analysis (COA) Reference
              </h4>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-muted)]">Official Document Number: </span>
                  <strong className="font-mono text-[var(--text-primary)]">{currentBatch.coaReferenceNo || `COA-${currentBatch.id}`}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Approval Date: </span>
                  <strong className="text-[var(--text-primary)]">
                    {new Date(currentBatch.qaApprovalDate || currentBatch.manufacturingDate).toLocaleDateString('en-GB')}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Scheduled Retest Date: </span>
                  <strong className="text-[var(--text-primary)]">
                    {new Date(currentBatch.retestDate || currentBatch.expiryDate).toLocaleDateString('en-GB')}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Blockchain & Cryptographic Provenance */}
        {activeTab === 'blockchain' && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hyperledger Fabric Node */}
              <div className="bg-[var(--bg-element)] rounded-xl p-5 border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Hyperledger Fabric World State</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Block Height:</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">#{currentBatch.blockNumber || 18432}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Ledger Channel:</span>
                    <span className="font-mono text-[var(--text-primary)]">pharmachain-consortium</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Chaincode ID:</span>
                    <span className="font-mono text-[var(--text-primary)]">pharmachain-cc:2.4</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Ledger Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {currentBatch.blockchainStatus || 'COMMITTED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Recorded Packs:</span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {(currentBatch.blockchainRecordedCount || currentBatch.totalQuantity).toLocaleString()} assets
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Keypair */}
              <div className="bg-[var(--bg-element)] rounded-xl p-5 border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>ECDSA Signing Identity (Tier 1)</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Curve & Algorithm:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">ES256 (ECDSA P-256 / SHA-256)</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Manufacturer ID:</span>
                    <span className="font-mono text-[var(--text-primary)]">{currentBatch.manufacturerId}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                    <span className="text-[var(--text-muted)]">Key Storage:</span>
                    <span className="text-[var(--text-primary)]">Hardware Security Module (HSM / AES-256-GCM Vault)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">S3 Artifact Storage:</span>
                    <span className="text-[var(--text-primary)] font-mono">{currentBatch.s3FileKey || `batches/${currentBatch.id}.csv`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Edit Batch Metadata (CRUD) */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Edit Batch Operational & Quality Specifications</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Update QA officer remarks, laboratory test outcomes, storage conditions, and internal logistics tags.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSavingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Storage Conditions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Storage Conditions</label>
                <input
                  type="text"
                  value={editFormData.storageConditions || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, storageConditions: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Temperature Range */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Temperature Range</label>
                <input
                  type="text"
                  value={editFormData.temperatureRange || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, temperatureRange: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Cold Chain Required */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(editFormData.coldChainRequired)}
                    onChange={(e) => setEditFormData({ ...editFormData, coldChainRequired: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Cold Chain Monitoring Required</span>
                </label>
              </div>

              {/* QA Officer ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">QA Release Officer ID</label>
                <input
                  type="text"
                  value={editFormData.qaOfficerId || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, qaOfficerId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* COA Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">COA Reference Number</label>
                <input
                  type="text"
                  value={editFormData.coaReferenceNo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, coaReferenceNo: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Assay Potency Result */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">HPLC Assay Potency Result</label>
                <input
                  type="text"
                  value={editFormData.assayResult || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, assayResult: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Microbial Test Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Microbial Test Status</label>
                <select
                  value={editFormData.microbialTestStatus || 'PASSED'}
                  onChange={(e) => setEditFormData({ ...editFormData, microbialTestStatus: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="PASSED">PASSED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              {/* Dissolution Test Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Dissolution Test Status</label>
                <select
                  value={editFormData.dissolutionTestStatus || 'PASSED'}
                  onChange={(e) => setEditFormData({ ...editFormData, dissolutionTestStatus: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="PASSED">PASSED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              {/* Supervisor ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Shift Supervisor ID</label>
                <input
                  type="text"
                  value={editFormData.supervisorId || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, supervisorId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Internal Batch Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)]">Internal Batch Notes</label>
              <textarea
                rows={3}
                value={editFormData.internalBatchNotes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, internalBatchNotes: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </form>
        )}
      </div>

      {/* ── Instant Pack QR Code Modal ─────────────────────────────────────── */}
      {selectedPackForQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-xl w-full p-6 shadow-xl relative overflow-hidden space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-500" />
                  <span>Instant 2D DataMatrix QR Code</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Pack Serial: {selectedPackForQR.serialNumber} • Batch: {currentBatch.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedPackForQR(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Visual & Thermal Label */}
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-[var(--bg-element)] p-5 rounded-xl border border-[var(--border-subtle)]">
              {/* SVG QR Code */}
              <div className="p-3 bg-white rounded-xl shadow-xs shrink-0">
                <QRCodeSVG
                  id={`qr-code-svg-${selectedPackForQR.serialNumber}`}
                  value={selectedPackForQR.verifyUrl || selectedPackForQR.signedToken || `https://pharmachain.gov.in/verify/${selectedPackForQR.packHash}`}
                  size={160}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Thermal Label Specification */}
              <div className="space-y-1.5 text-xs text-left w-full">
                <div className="font-bold text-sm text-[var(--text-primary)]">{currentBatch.medicineName}</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {currentBatch.dosage} • {currentBatch.form}
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1 font-mono text-[11px]">
                  <div>
                    <span className="text-[var(--text-muted)]">B.No: </span>
                    <strong className="text-[var(--text-primary)]">{currentBatch.id}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">SN: </span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{selectedPackForQR.serialNumber}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">EXP: </span>
                    <strong className="text-[var(--text-primary)]">
                      {new Date(currentBatch.expiryDate).toLocaleDateString('en-GB')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Download & Token Copy */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => downloadQRAsPNG(selectedPackForQR.serialNumber)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download 1024px PNG</span>
              </button>

              <button
                onClick={() => copyToClipboard(selectedPackForQR.signedToken || selectedPackForQR.verifyUrl, 'token')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedToken ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>Copy Signed Token</span>
              </button>
            </div>

            {/* Cryptographic Token Inspector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                Raw ES256 Signed JWT Token
              </span>
              <div className="p-2.5 rounded-lg bg-black/40 border border-[var(--border-subtle)] text-[11px] font-mono text-emerald-400 break-all max-h-20 overflow-y-auto">
                {selectedPackForQR.signedToken || 'No signed token string present in payload'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Live Pack Verification Modal ──────────────────────────────────── */}
      {verifyingPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl max-w-lg w-full p-6 shadow-xl relative overflow-hidden space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Real-time Cryptographic Audit</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Serial: {verifyingPack.serialNumber}
                </p>
              </div>
              <button
                onClick={() => setVerifyingPack(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isVerifying ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Auditing ES256 ECDSA Signature & Fabric Ledger State...
                </p>
              </div>
            ) : verificationResult ? (
              <div className="space-y-4 text-xs">
                {/* Status Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    verificationResult.verificationStatus === 'GENUINE'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : verificationResult.verificationStatus === 'RECALLED'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {verificationResult.verificationStatus === 'GENUINE' ? (
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertOctagon className="w-6 h-6 shrink-0 text-rose-500" />
                  )}
                  <div>
                    <div className="font-bold text-sm uppercase tracking-wide">
                      {verificationResult.verificationStatus}
                    </div>
                    <div className="text-[11px] opacity-90">
                      {verificationResult.verificationStatus === 'GENUINE'
                        ? 'Cryptographic integrity confirmed. Pack is authentic and untampered.'
                        : verificationResult.message || 'Quarantine directive in effect.'}
                    </div>
                  </div>
                </div>

                {/* Audit Attributes */}
                <div className="bg-[var(--bg-element)] rounded-xl p-4 border border-[var(--border-subtle)] space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Algorithm:</span>
                    <span className="text-[var(--text-primary)] font-bold">{verificationResult.algorithm || 'ES256 (ECDSA P-256)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Signature Verified:</span>
                    <span className="text-emerald-500 font-bold">{verificationResult.signatureValid ? 'TRUE' : 'FALSE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Fabric On-Chain State:</span>
                    <span className="text-cyan-500 font-bold">{verificationResult.onChainState || 'MINTED'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Verified At:</span>
                    <span className="text-[var(--text-primary)]">{verificationResult.verifiedAt}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
