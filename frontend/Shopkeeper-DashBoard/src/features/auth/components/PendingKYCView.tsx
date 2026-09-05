import React, { useState } from 'react';
import { useAuth } from '../hooks/auth.hooks';
import { Clock, RefreshCw, ArrowLeft } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

export const PendingKYCView: React.FC = () => {
  const { user, fetchProfile, setAuthView } = useAuth();
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    try {
      setChecking(true);
      const profile = await fetchProfile();
      if (profile && (profile.kycStatus === 'APPROVED' || (profile as any).verificationStatus?.toLowerCase() === 'approved')) {
        showToast({
          type: 'success',
          title: 'Pharmacy License Approved',
          message: 'Your Form 20/21 license has been verified by the CDSCO Drug Inspector.',
        });
      } else {
        showToast({
          type: 'info',
          title: 'Verification In Progress',
          message: 'Your drug license application is currently being reviewed by the Drug Inspector.',
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Status Check Failed',
        message: 'Could not connect to regulatory verification server.',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-amber-500/30 rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden backdrop-blur-xl text-center space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
        <Clock className="w-7 h-7 animate-pulse" />
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Pharmacy License Verification in Progress
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-sm mx-auto">
          Your retail drug license application for <strong className="text-[var(--text-primary)]">{user?.shopName || 'Registered Pharmacy'}</strong> is under review with the State Drug Control Administration (CDSCO Form 20/21).
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-[var(--bg-element)] border border-[var(--border)] text-xs text-left space-y-2 max-w-sm mx-auto">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Pharmacy ID:</span>
          <span className="font-mono font-bold text-[var(--text-primary)]">{user?.shopId || 'PENDING'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">License Applied:</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">{user?.licenseNumber || 'CDSCO Form 20/21'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Review Authority:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">State Pharmacy Council</span>
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleCheckStatus}
          disabled={checking}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Checking Status...' : 'Check Verification Status'}</span>
        </button>

        <button
          onClick={() => setAuthView('login')}
          className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] text-[var(--text-primary)] hover:bg-[var(--bg-active)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
};
