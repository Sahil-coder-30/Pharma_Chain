import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useAuth } from '../../features/auth/hooks/auth.hooks';
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  LogOut,
  User,
  ChevronDown,
  Clock,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    profile,
    alerts,
    recalls,
    setIsMobileSidebarOpen,
    setIsSearchOpen,
    setIsHelpOpen,
    navigateTo,
  } = useDashboard();

  const { user, kycStatus, logout } = useAuth();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'recalls' | 'alerts'>('all');

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const activeRecalls = recalls.filter((r) => r.status === 'ACTIVE');
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const totalUnreadCount = activeRecalls.length + unresolvedAlerts.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Toggle & Global Spotlight Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)] focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Spotlight Search Bar */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[var(--bg-element)] hover:bg-[var(--bg-active)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all group w-full max-w-md cursor-pointer"
        >
          <Search className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
          <span className="font-medium flex-1 text-left">Search batches, medicine packs, recalls...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[var(--bg-surface)] text-[var(--text-muted)] rounded border border-[var(--border)]">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Help, Notifications, Theme Quick Toggle, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Help & SOPs Button */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
          title="Help, SOP Guides & CDSCO Regulations"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)] border border-transparent hover:border-[var(--border)] relative transition-all cursor-pointer"
            title="Notifications & Regulatory Alerts"
          >
            <Bell className="w-4 h-4" />
            {totalUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[var(--bg-surface)]" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border)] shadow-2xl z-50 overflow-hidden text-xs">
              <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)]">Notifications & Alerts</span>
                  {totalUnreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      {totalUnreadCount} Active
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[var(--border)] bg-[var(--bg-element)] px-2 pt-1 gap-1">
                {(['all', 'recalls', 'alerts'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setNotifTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold capitalize transition-all border-b-2 cursor-pointer ${
                      notifTab === tab
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab === 'all'
                      ? `All (${totalUnreadCount})`
                      : tab === 'recalls'
                      ? `Recalls (${activeRecalls.length})`
                      : `Security (${unresolvedAlerts.length})`}
                  </button>
                ))}
              </div>

              {/* Filtered Notification List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
                {/* 1. Recalls (shown for 'all' and 'recalls') */}
                {(notifTab === 'all' || notifTab === 'recalls') &&
                  activeRecalls.map((recall) => (
                    <div
                      key={recall.id}
                      onClick={() => {
                        navigateTo('recalls');
                        setIsNotifOpen(false);
                      }}
                      className="p-3 hover:bg-[var(--bg-active)] cursor-pointer flex items-start gap-2.5 transition-colors"
                    >
                      <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-rose-600 dark:text-rose-400">Recall: {recall.batchId}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">{recall.date}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{recall.reason}</p>
                      </div>
                    </div>
                  ))}

                {/* 2. Security Alerts (shown for 'all' and 'alerts') */}
                {(notifTab === 'all' || notifTab === 'alerts') &&
                  unresolvedAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        navigateTo('recalls');
                        setIsNotifOpen(false);
                      }}
                      className="p-3 hover:bg-[var(--bg-active)] cursor-pointer flex items-start gap-2.5 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[var(--text-primary)]">{alert.title}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{alert.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{alert.description}</p>
                      </div>
                    </div>
                  ))}

                {((notifTab === 'recalls' && activeRecalls.length === 0) ||
                  (notifTab === 'alerts' && unresolvedAlerts.length === 0) ||
                  (notifTab === 'all' && totalUnreadCount === 0)) && (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    No active notifications in this category.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[var(--bg-element)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
          >
            <div
              className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-sm ${
                kycStatus === 'APPROVED' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              {(user?.name || profile.name).slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-[var(--text-primary)] leading-none truncate max-w-[140px]">
                {user?.name || profile.name}
              </div>
              <div className="text-[10px] flex items-center gap-1 mt-0.5 font-mono">
                {kycStatus === 'APPROVED' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> CDSCO Verified
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> KYC Pending
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border)] shadow-2xl z-50 p-2 text-xs space-y-1">
              <div className="px-2.5 py-2 border-b border-[var(--border)]">
                <div className="font-bold text-[var(--text-primary)] truncate">{user?.name || profile.name}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                  {user?.licenseNumber || profile.licenseNumber}
                </div>
              </div>

              <button
                onClick={() => {
                  navigateTo('profile');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-element)] text-left transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span>Company Legal Profile</span>
              </button>

              <button
                onClick={() => {
                  navigateTo('security');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-element)] text-left transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cryptographic Key Vault</span>
              </button>


              {/* Sign out */}
              <div className="pt-1 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-500 hover:bg-rose-500/10 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="font-semibold">Sign Out from Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
