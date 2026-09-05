import React, { useState } from 'react';
import { useAdminData } from '../context/AdminDataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { RejectDialog } from '../components/common/RejectDialog';
import {
  Factory,
  Store,
  KeyRound,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronRight,
  Landmark,
  MapPin,
  ExternalLink,
  Activity,
  Zap,
  Cpu,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { ManufacturerRecord } from '../types/admin';
import { useToast } from '../context/ToastContext';

export const DashboardOverviewPage: React.FC = () => {
  const {
    stats,
    manufacturers,
    shopkeepers,
    auditLogs,
    approveManufacturer,
    rejectManufacturer,
  } = useAdminData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Quick Action Modal states
  const [selectedMfrForApproval, setSelectedMfrForApproval] = useState<ManufacturerRecord | null>(null);
  const [selectedMfrForRejection, setSelectedMfrForRejection] = useState<ManufacturerRecord | null>(null);
  const [copiedLicense, setCopiedLicense] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const pendingMfrList = manufacturers.filter((m) => m.kycStatus === 'PENDING');
  const pendingShopList = shopkeepers.filter((s) => s.verificationStatus === 'pending');
  const totalPending = pendingMfrList.length + pendingShopList.length;

  const handleCopyLicense = (lic: string) => {
    navigator.clipboard.writeText(lic);
    setCopiedLicense(lic);
    showToast({
      type: 'info',
      title: 'License Copied',
      message: `License number ${lic} copied to clipboard.`,
    });
    setTimeout(() => setCopiedLicense(null), 2000);
  };

  const handleConfirmApproveMfr = async () => {
    if (!selectedMfrForApproval) return;
    setLoadingAction(true);
    try {
      await approveManufacturer(selectedMfrForApproval.manufacturerId);
      setSelectedMfrForApproval(null);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmRejectMfr = async (reason: string) => {
    if (!selectedMfrForRejection) return;
    setLoadingAction(true);
    try {
      await rejectManufacturer(selectedMfrForRejection.manufacturerId, reason);
      setSelectedMfrForRejection(null);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Hero Operations Center Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#07192f] via-[#0b2545] to-[#0c1f3a] p-6 sm:p-8 text-white border border-[#1a3869] shadow-xl">
        {/* Ambient Decorative Blurs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/30 inline-flex items-center gap-1.5 shadow-sm">
                <Landmark className="w-3.5 h-3.5 text-amber-400" />
                CENTRAL DRUGS STANDARD CONTROL ORGANISATION
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                BLOCKCHAIN CONSENSUS: ACTIVE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black tracking-tight text-white leading-tight">
              National Drug Verification & Root Keystore
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-normal">
              Central regulatory authority overseeing pharmaceutical KYC credentials, pharmacy drug distribution compliance, and cryptographic batch minting certificates across India.
            </p>

            {/* Live Telemetry Bar */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>ECDSA P-256 (SHA-256)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Hyperledger Fabric v2.5</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Zero-Tamper Ledger</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/manufacturers')}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#07192f] font-black shadow-lg shadow-amber-500/20 border border-amber-300/40"
              icon={<Factory className="w-4 h-4 text-[#07192f]" />}
            >
              Inspect KYC Queue ({stats?.manufacturers.pending ?? 0})
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/audit-logs')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur-sm"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Export Statutory Audit Log
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Rich Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Pending MFRs */}
        <div
          onClick={() => navigate('/manufacturers?status=PENDING')}
          className="gov-card gov-card-hover p-5 cursor-pointer group card-amber-highlight relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 transition-transform group-hover:scale-105">
              <Factory className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 shadow-sm animate-pulse">
              Action Required
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {stats?.manufacturers.pending ?? 0}
            </h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Pending Manufacturer KYC</p>
          </div>

          {/* Mini SLA progress indicator */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {(() => {
              const total = stats?.manufacturers.total ?? 0;
              const approved = stats?.manufacturers.approved ?? 0;
              const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
              return (
                <>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>{approved} of {total} Plants Cleared</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">{pct}% Approved</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, pct)}%` }} />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Card 2: Pending Shops */}
        <div
          onClick={() => navigate('/shopkeepers?status=pending')}
          className="gov-card gov-card-hover p-5 cursor-pointer group card-blue-highlight relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105">
              <Store className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2.5 py-1 rounded-md border border-blue-300 dark:border-blue-800 shadow-sm">
              SLA Queue
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {stats?.shopkeepers.pending ?? 0}
            </h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Pending Pharmacy Licenses</p>
          </div>

          {/* Mini SLA progress indicator */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {(() => {
              const total = stats?.shopkeepers.total ?? 0;
              const approved = stats?.shopkeepers.approved ?? 0;
              const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
              return (
                <>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>{approved} of {total} Dispensaries Cleared</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">{pct}% Approved</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, pct)}%` }} />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Card 3: Cryptographic Keys */}
        <div
          onClick={() => navigate('/keys')}
          className="gov-card gov-card-hover p-5 cursor-pointer group card-emerald-highlight relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-105">
              <KeyRound className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-800 shadow-sm font-mono">
              FIPS 140-2
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {stats?.cryptography.activeKeys ?? 0}
            </h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Active Root Keypairs</p>
          </div>

          {/* Mini SLA progress indicator */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Keystore HSM Cluster</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">100% Active</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-full" />
            </div>
          </div>
        </div>

        {/* Card 4: Active Approved Network */}
        <div
          onClick={() => navigate('/shopkeepers?status=approved')}
          className="gov-card gov-card-hover p-5 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0b2545] to-[#1a4478] text-white flex items-center justify-center font-bold shadow-md shadow-navy-900/20 transition-transform group-hover:scale-105">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-md shadow-sm font-mono">
              SECURE LEDGER
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {(stats?.shopkeepers.approved ?? 0) + (stats?.manufacturers.approved ?? 0)}
            </h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Authorized Supply Chain Nodes</p>
          </div>

          {/* Mini SLA progress indicator */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Network Trust Anchor</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">Verified</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Priority Verification Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Priority Verification Queue</span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-sm">
                  {totalPending} Awaiting Review
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Statutory applications awaiting CDSCO officer inspection & cryptographic provisioning
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0b172a] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm overflow-hidden">
            {pendingMfrList.length === 0 && pendingShopList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">Regulatory Verification Queue Cleared</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All manufacturer and pharmacy license submissions are verified.</p>
              </div>
            ) : (
              <>
                {/* Pending Manufacturers */}
                {pendingMfrList.map((mfr) => (
                  <div
                    key={mfr.manufacturerId}
                    className="p-4 sm:p-5 hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm font-bold text-xs">
                        {mfr.companyName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{mfr.companyName}</h4>
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 shadow-sm">
                            MANUFACTURER KYC
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400">Lic:</span>
                            <code className="font-mono font-bold text-slate-900 dark:text-slate-100">{mfr.licenseNumber}</code>
                            <button
                              onClick={() => handleCopyLicense(mfr.licenseNumber)}
                              className="text-slate-400 hover:text-blue-700 p-0.5"
                              title="Copy License"
                            >
                              {copiedLicense === mfr.licenseNumber ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3 h-3 text-slate-400" />{mfr.state || 'India'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMfrForRejection(mfr)}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => setSelectedMfrForApproval(mfr)}
                        icon={<Lock className="w-3 h-3" />}
                      >
                        Approve & Provision Key
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pending Pharmacies */}
                {pendingShopList.map((shop) => (
                  <div
                    key={shop.shopId}
                    className="p-4 sm:p-5 hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm font-bold text-xs">
                        {shop.shopName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{shop.shopName}</h4>
                          <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800 shadow-sm uppercase">
                            {shop.licenseType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400">Lic:</span>
                            <code className="font-mono font-bold text-slate-900 dark:text-slate-100">{shop.drugLicenseNumber}</code>
                            <button
                              onClick={() => handleCopyLicense(shop.drugLicenseNumber)}
                              className="text-slate-400 hover:text-blue-700 p-0.5"
                              title="Copy License"
                            >
                              {copiedLicense === shop.drugLicenseNumber ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3 h-3 text-slate-400" />{shop.city}, {shop.state}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/shopkeepers')}
                      >
                        Inspect License Form
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Live Regulatory Decisions Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Live Decision Trail</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Immutable audit ledger of officer actions</p>
            </div>
            <button
              onClick={() => navigate('/audit-logs')}
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm"
            >
              <span>Full Ledger</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white dark:bg-[#0b172a] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800/90 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm">
            {auditLogs.slice(0, 5).map((log) => {
              const isApproved = log.action.includes('APPROVED');
              const isSuspended = log.action.includes('SUSPENDED');

              return (
                <div key={log._id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold border shadow-sm ${
                      isApproved
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : isSuspended
                        ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                        : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {isApproved ? '✓' : isSuspended ? '⚡' : '✕'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                        {log.targetName || log.targetId}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.action.replace('_', ' ')}</span> by{' '}
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{log.performedBy.fullName}</span>
                    </div>

                    {log.reason && (
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl mt-1.5 border border-slate-200 dark:border-slate-700 leading-relaxed shadow-sm">
                        {log.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation & Rejection Modals */}
      <ConfirmDialog
        isOpen={!!selectedMfrForApproval}
        onClose={() => setSelectedMfrForApproval(null)}
        onConfirm={handleConfirmApproveMfr}
        title="Authorize Manufacturer & Provision Cryptographic Key"
        targetName={selectedMfrForApproval?.companyName || ''}
        targetId={selectedMfrForApproval?.manufacturerId}
        licenseNumber={selectedMfrForApproval?.licenseNumber}
        applicationDate={selectedMfrForApproval?.createdAt}
        email={selectedMfrForApproval?.email}
        location={selectedMfrForApproval?.plantAddress || selectedMfrForApproval?.state}
        issuingAuthority={selectedMfrForApproval?.issuingAuthority}
        isKeyProvisioning={true}
        loading={loadingAction}
      />

      <RejectDialog
        isOpen={!!selectedMfrForRejection}
        onClose={() => setSelectedMfrForRejection(null)}
        onReject={handleConfirmRejectMfr}
        title="Reject Manufacturer KYC Application"
        targetName={selectedMfrForRejection?.companyName || ''}
        loading={loadingAction}
      />
    </div>
  );
};
