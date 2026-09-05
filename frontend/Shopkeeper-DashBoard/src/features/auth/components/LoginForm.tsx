import React, { useState } from 'react';
import { useAuth } from '../hooks/auth.hooks';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  BadgeCheck,
  Store,
} from 'lucide-react';
export const LoginForm: React.FC = () => {
  const {
    login,
    verify2FA,
    setAuthView,
    requires2FA,
    pendingLoginEmail,
    loading,
    error,
    clearError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = 'Pharmacy email or License No. is required';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requires2FA) {
      if (!twoFactorCode || twoFactorCode.length < 6) {
        setFieldErrors({ twoFactorCode: 'Please enter valid 6-digit security token' });
        return;
      }
      await verify2FA(twoFactorCode);
      return;
    }

    if (!validate()) return;

    try {
      await login({
        email: email.trim(),
        password,
        rememberMe,
      });
    } catch (err) {
      // Error handled in hook
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Sleek Minimalist Linear / Stripe Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-colors">
        {/* Top subtle glow halo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header */}
        <div className="text-center mb-7 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-600/25 mx-auto mb-4 ring-1 ring-white/20">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {requires2FA ? 'Two-Factor Authentication' : 'Chemist & Pharmacy Portal'}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
            {requires2FA
              ? `Enter the 6-digit cryptographic security code sent to ${pendingLoginEmail}`
              : 'Sign in to access retail counter POS, batch intake & CDSCO compliance'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[var(--alert-danger-bg)] border border-[var(--alert-danger-border)] text-[var(--alert-danger-text)] text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Minimalist Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {!requires2FA ? (
            <>
              {/* Pharmacy Email / License Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Pharmacy Email or License ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <Mail className="w-4 h-4 opacity-70" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.email;
                          return n;
                        });
                      }
                    }}
                    placeholder="chemist@pharmacy.in or DL-20-B"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-element)] border ${
                      fieldErrors.email
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-[var(--border)] focus:border-emerald-500'
                    } text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Workstation Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthView('forgot-password')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium transition-colors cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <Lock className="w-4 h-4 opacity-70" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.password;
                          return n;
                        });
                      }
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-element)] border ${
                      fieldErrors.password
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-[var(--border)] focus:border-emerald-500'
                    } text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.password}</p>
                )}
              </div>

              {/* Remember checkbox & Security tag */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[var(--border)] text-emerald-600 focus:ring-emerald-500 bg-[var(--bg-element)] cursor-pointer"
                  />
                  <span className="text-xs text-[var(--text-muted)]">Remember this POS terminal</span>
                </label>
                <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>256-bit TLS</span>
                </span>
              </div>
            </>
          ) : (
            /* 2FA Challenge */
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[var(--text-primary)] text-center">
                6-Digit Security Token
              </label>
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] text-lg font-mono py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] focus:border-emerald-500 text-[var(--text-primary)] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold"
                autoFocus
              />
              {fieldErrors.twoFactorCode && (
                <p className="text-[11px] text-rose-500 text-center font-medium">
                  {fieldErrors.twoFactorCode}
                </p>
              )}
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating Terminal...</span>
              </>
            ) : requires2FA ? (
              <span>Verify & Launch POS</span>
            ) : (
              <>
                <span>Sign in to Pharmacy Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Register Footnote */}
        <div className="mt-5 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            New Retail Pharmacy?{' '}
            <button
              type="button"
              onClick={() => setAuthView('register')}
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors cursor-pointer"
            >
              Register Pharmacy License (Form 20/21) →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
