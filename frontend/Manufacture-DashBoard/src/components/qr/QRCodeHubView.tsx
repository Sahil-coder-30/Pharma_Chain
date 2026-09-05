import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useToast } from '../../context/ToastContext';
import {
  QrCode,
  Download,
  Copy,
  Printer,
  CheckCircle2,
  Lock,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  AlertOctagon,
} from 'lucide-react';

export const QRCodeHubView: React.FC = () => {
  const { batches, profile, fetchBatchPreview, downloadBatchCsv, mintBatch } = useDashboard();
  const { showToast } = useToast();

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    batches.length > 0 ? batches[0].id : 'BATCH-2026-001'
  );
  const [sampleSerial, setSampleSerial] = useState('00001');
  const [livePackData, setLivePackData] = useState<any>(null);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  useEffect(() => {
    if (selectedBatch?.id) {
      if (selectedBatch.mintStatus !== 'MINTED' && selectedBatch.mintStatus !== 'RECALLED') {
        setLivePackData(null);
        return;
      }
      fetchBatchPreview(selectedBatch.id, 1, 10)
        .then((res) => {
          if (res?.packs && res.packs.length > 0) {
            const firstPack = res.packs[0];
            setLivePackData(firstPack);
            setSampleSerial(firstPack.serialNumber || '00001');
          } else {
            setLivePackData(null);
          }
        })
        .catch(() => {
          setLivePackData(null);
        });
    }
  }, [selectedBatch?.id, selectedBatch?.mintStatus, fetchBatchPreview]);

  const liveJWT = livePackData?.signedToken || null;
  const isMinted = selectedBatch?.mintStatus === 'MINTED' || selectedBatch?.mintStatus === 'RECALLED';
  const qrCodeValue = livePackData?.verifyUrl || (liveJWT ? `https://pharmachain.gov.in/verify/${livePackData?.packHash || 'pack'}?token=${liveJWT}` : '');

  const handleCopyJWT = () => {
    if (!liveJWT) {
      showToast({
        type: 'warning',
        title: 'Batch Not Minted',
        message: 'Please mint this batch first to generate cryptographic tokens.',
      });
      return;
    }
    navigator.clipboard.writeText(liveJWT);
    showToast({
      type: 'info',
      title: 'Copied',
      message: 'Signed Tier-1 JWT token copied to clipboard.',
    });
  };

  const handleCopyVerifyUrl = () => {
    if (!qrCodeValue) {
      showToast({
        type: 'warning',
        title: 'Batch Not Minted',
        message: 'Please mint this batch first to generate scannable URLs.',
      });
      return;
    }
    navigator.clipboard.writeText(qrCodeValue);
    showToast({
      type: 'info',
      title: 'Copied',
      message: 'Scannable verification URL copied to clipboard.',
    });
  };

  const handleDownloadZIP = (format: string) => {
    if (!selectedBatch) return;
    if (!isMinted) {
      showToast({
        type: 'warning',
        title: 'Batch Still Minting',
        message: `Batch ${selectedBatch.id} is currently in "${selectedBatch.mintStatus}" status. The QR code CSV package will be ready once minting completes.`,
        duration: 6000,
      });
      return;
    }

    let type: 'packs' | 'boxes' | 'cartons' = 'packs';
    if (format === 'ZIP_PNG' || format === 'boxes') type = 'boxes';
    if (format === 'ZIP_SVG' || format === 'cartons') type = 'cartons';

    downloadBatchCsv(selectedBatch.id, type);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
              2D DataMatrix & QR Serialization Hub
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              GS1 & CDSCO Tier-1/2
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Generate GS1 Digital Link DataMatrix & 2D QR payloads with ECDSA ES256 cryptographic signatures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadZIP('ZIP_PNG')}
            disabled={!isMinted}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Selected Batch CSV</span>
          </button>
        </div>
      </div>

      {/* Minting In-Progress Notification */}
      {selectedBatch?.mintStatus === 'MINTING' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>
              <strong>Cryptographic Minting in Progress:</strong> Batch <code className="font-mono font-bold text-white">{selectedBatch.id}</code> is currently being signed with ES256 nonces and committed to the blockchain. QR codes will unlock once minted.
            </span>
          </div>
          <span className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold shrink-0">
            STATUS: MINTING
          </span>
        </div>
      )}

      {/* S3 Failure Notification */}
      {selectedBatch?.mintStatus === 'FAILED' && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">AWS S3 Minting / Storage Failed</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5 font-mono break-all">
                {selectedBatch.mintError || 'Batch failed to store tokens in AWS S3. Local disk fallback is disabled.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => mintBatch(selectedBatch.id)}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Retry S3 Mint</span>
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive QR Code Inspector & Barcode Canvas */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-subtle p-6 flex flex-col items-center text-center">
            <div className="w-full flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Live 2D Barcode Preview
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${isMinted && livePackData ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : selectedBatch?.mintStatus === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                {isMinted && livePackData ? '● Live Authenticated QR' : selectedBatch?.mintStatus === 'FAILED' ? '✕ S3 Mint Failed' : '○ Mint Required'}
              </span>
            </div>

            {/* Rendered 2D QR Barcode Visual (Real Dynamic QRCodeSVG) */}
            {isMinted && qrCodeValue ? (
              <div className="p-4 bg-white rounded-2xl border-2 border-emerald-600 shadow-lg inline-flex items-center justify-center my-2">
                <QRCodeSVG
                  value={qrCodeValue}
                  size={210}
                  level="M"
                  includeMargin={true}
                  className="w-48 h-48 sm:w-56 sm:h-56"
                />
              </div>
            ) : selectedBatch?.mintStatus === 'FAILED' ? (
              <div className="p-6 my-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex flex-col items-center justify-center space-y-3 w-full max-w-[260px] text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-rose-200">S3 Minting Failed</p>
                  <p className="text-[11px] text-rose-300/80 font-mono text-center break-words line-clamp-3">
                    {selectedBatch.mintError || 'AWS S3 upload error'}
                  </p>
                </div>
                <button
                  onClick={() => mintBatch(selectedBatch.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Retry S3 Mint</span>
                </button>
              </div>
            ) : (
              <div className="p-8 my-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-element)] flex flex-col items-center justify-center space-y-3 w-full max-w-[260px]">
                <QrCode className="w-16 h-16 text-[var(--text-muted)] opacity-50" />
                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  <p className="font-bold text-[var(--text-primary)]">
                    {selectedBatch?.mintStatus === 'MINTING' ? 'Signing in Progress...' : 'Batch Not Yet Minted'}
                  </p>
                  <p className="text-[11px]">
                    {selectedBatch?.mintStatus === 'MINTING'
                      ? 'ES256 signatures are being generated.'
                      : 'Mint this batch to generate cryptographically signed scannable QRs.'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-2 text-xs text-[var(--text-muted)] space-y-0.5">
              <span className="font-mono font-bold text-emerald-400 block">
                {selectedBatch?.id} • Serial #{sampleSerial}
              </span>
              <p className="text-[11px] text-[var(--text-muted)]">
                Scannable with Shopkeeper & Customer Mobile Apps • Error Correction: Level M (15%)
              </p>
            </div>

            {isMinted && qrCodeValue && (
              <div className="w-full mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={handleCopyVerifyUrl}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copy Live Scan URL</span>
                </button>
                <button
                  onClick={handleCopyJWT}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Signed Token</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Package Selector & JWT Payload Structure */}
        <div className="lg:col-span-7 space-y-4">
          {/* Batch Selector Bar */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 shadow-subtle space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Select Batch for Packaging & Serialization Export
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-[var(--text-primary)] mb-1">
                  Active Production Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] font-semibold text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500/20"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                      {b.id} — {b.medicineName} ({b.totalQuantity.toLocaleString()} packs)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[var(--text-primary)] mb-1">
                  Sample Serial Number (00001 - {selectedBatch?.totalQuantity})
                </label>
                <input
                  type="text"
                  value={sampleSerial}
                  onChange={(e) => setSampleSerial(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] font-mono font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="00042"
                />
              </div>
            </div>

            {/* Export Format Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleDownloadZIP('ZIP_PNG')}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] transition-all text-left group cursor-pointer"
              >
                <FileArchive className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  ZIP Package (PNG)
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">300 DPI High-Density</span>
              </button>

              <button
                onClick={() => handleDownloadZIP('ZIP_SVG')}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] transition-all text-left group cursor-pointer"
              >
                <QrCode className="w-5 h-5 text-teal-400 mb-1" />
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Vector ZIP (SVG)
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Lossless Carton Scale</span>
              </button>

              <button
                onClick={() => handleDownloadZIP('CSV_MANIFEST')}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] transition-all text-left group cursor-pointer"
              >
                <FileSpreadsheet className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  CSV Token Manifest
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Serials & Pack Hashes</span>
              </button>
            </div>
          </div>

          {/* Signed JWT Payload Inspector */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 shadow-subtle text-[var(--text-primary)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Tier-1 Micro-Payload (QR Code Token)
                </h4>
              </div>
              <button
                onClick={handleCopyJWT}
                className="p-1.5 rounded-lg bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer"
                title="Copy JWT"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block mb-1">
                  1. JOSE Header (`ES256`)
                </span>
                <pre className="text-cyan-400 text-[11px] font-mono">
                  {JSON.stringify({ alg: 'ES256', kid: profile.keyId, typ: 'JWT' }, null, 2)}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block mb-1">
                  2. Tier-1 Physical Pack Claims (Signed Payload)
                </span>
                <pre className="text-emerald-400 text-[11px] font-mono">
                  {JSON.stringify(
                    {
                      batchId: selectedBatch?.id,
                      serial: sampleSerial,
                      expiryDate: selectedBatch?.expiryDate,
                      manufacturerId: profile.id,
                      nonce: 'a3f7b2c1',
                      ts: '3460914344715500',
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 inline mr-1.5" />
              Asymmetrically signed using NIST P-256 curve ECDSA. Fully verifiable offline by POS & mobile verification apps.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
