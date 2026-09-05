import React, { useState } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useAuth } from '../../features/auth/hooks/auth.hooks';
import {
  Search,
  Bell,
  Sun,
  Moon,
  QrCode,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  LogOut,
  User,
  ShieldCheck,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const {
    theme,
    toggleThemeMode,
    setIsSearchOpen,
    setIsHelpOpen,
    setIsScanModalOpen,
    setActiveScanMode,
    recalls,
    sales,
    navigateTo,
  } = useDashboard();
  const { user, logout } = useAuth();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'ALL' | 'RECALLS'>('ALL');

  const activeRecalls = recalls.filter((r) => r.status === 'ACTIVE');

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none sticky top-0 z-20">
      {/* Left: Mobile Drawer Trigger + Global Spotlight Search Trigger */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 shadow-xs"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-emerald-500/40 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 opacity-70 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Search medicines, batches, patient invoices...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick POS Action & Utility Icons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Camera Dispense Button */}
        <button
          onClick={() => {
            setActiveScanMode('DISPENSE');
            setIsScanModalOpen(true);
          }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Quick Scan</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={() => toggleThemeMode()}
          className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {activeRecalls.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[var(--bg-surface)]" />
            )}
          </button>

          {isNotifOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsNotifOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl z-40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                  <span className="font-bold text-xs text-[var(--text-primary)]">
                    Terminal Notifications
                  </span>
                  <div className="flex bg-[var(--bg-element)] p-0.5 rounded-lg text-[10px] font-semibold">
                    <button
                      onClick={() => setNotifTab('ALL')}
                      className={`px-2 py-0.5 rounded ${notifTab === 'ALL' ? 'bg-emerald-600 text-white' : 'text-[var(--text-muted)]'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setNotifTab('RECALLS')}
                      className={`px-2 py-0.5 rounded ${notifTab === 'RECALLS' ? 'bg-rose-600 text-white' : 'text-[var(--text-muted)]'}`}
                    >
                      Recalls ({activeRecalls.length})
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                  {notifTab === 'RECALLS' || notifTab === 'ALL' ? (
                    activeRecalls.map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => {
                          setIsNotifOpen(false);
                          navigateTo('recalls');
                        }}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs">{rec.medicineName}</strong>
                          <span className="font-mono text-[10px]">LOCK ACTIVE</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{rec.reason}</p>
                      </div>
                    ))
                  ) : null}

                  {notifTab === 'ALL' &&
                    sales.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl bg-[var(--bg-element)] text-[var(--text-primary)] space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <strong>Sale Committed: {s.invoiceNo}</strong>
                          <span className="font-mono text-emerald-500">₹{s.grandTotal}</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Patient: {s.patientName} • Block #{s.blockNumber}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Help & Support Trigger */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Terminal Help & Support"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
