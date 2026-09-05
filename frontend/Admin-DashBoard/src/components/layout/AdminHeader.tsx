import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAdminData } from '../../context/AdminDataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Bell,
  UserCheck,
  RefreshCw,
  Sun,
  Moon,
  ShieldCheck,
  Landmark,
  LogOut,
  ChevronDown,
  Lock,
  Cpu,
  KeyRound,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { stats, refreshData, isLoading } = useAdminData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalUrgent = stats?.urgentActionRequired ?? 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 select-none shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
      {/* Official Government National Strip */}
      <div className="gov-tricolor-bar" />
      <div className="bg-gradient-to-r from-[#07192f] via-[#0b2545] to-[#07192f] text-slate-200 text-[11px] px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between border-b border-[#14325c]">
        <div className="flex items-center gap-2 sm:gap-3">
          <Landmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="font-bold tracking-wide text-white">भारत सरकार | Government of India</span>
          <span className="hidden md:inline text-slate-300">• Central Drugs Standard Control Organisation (CDSCO)</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-300 font-mono">
          <span className="hidden lg:flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE TELEMETRY • 14ms
          </span>
          <span className="bg-blue-950 px-2 py-0.5 rounded text-amber-300 border border-blue-800/80 font-bold">
            RESTRICTED ACCESS
          </span>
        </div>
      </div>

      {/* Main Command Bar */}
      <div className="h-16 bg-white dark:bg-[#081326] backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 px-3 sm:px-6 lg:px-8 flex items-center justify-between transition-colors duration-200">
        {/* Left: Hamburger (Mobile) + Node Identity & Sync Controls */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700/80 shadow-xs"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs shadow-xs">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs tracking-wide font-mono truncate max-w-[150px] sm:max-w-none">
              CDSCO GATEWAY CONNECTED
            </span>
          </div>

          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
            title="Refresh All Queues"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </button>
        </div>

        {/* Right: Urgent Alerts & Corner Officer Menu Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Urgent Action Alert Trigger */}
          <button
            onClick={() => navigate('/manufacturers')}
            className="relative p-2.5 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
            title={`${totalUrgent} items pending inspection`}
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {totalUrgent > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-[#081326] shadow-xs">
                {totalUrgent}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700/80" />

          {/* Corner Profile & Settings Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/90 shadow-sm hover:shadow transition-all group active:scale-98"
              title="Open Officer Settings & Theme Menu"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0b2545] via-[#12396b] to-[#1c559d] text-white flex items-center justify-center font-bold text-xs shadow-md border border-amber-400/40 flex-shrink-0">
                {user?.fullName?.charAt(0) || 'O'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                    {user?.fullName || 'Government Officer'}
                  </span>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                  {user?.role || 'REGULATORY OFFICER'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Corner Dropdown Modal */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0c1a30] border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-fadeIn">
                {/* Profile Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#071326]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0b2545] via-[#12396b] to-[#1c559d] text-white flex items-center justify-center font-black text-sm shadow-md border border-amber-400/40 flex-shrink-0">
                      {user?.fullName?.charAt(0) || 'O'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 dark:text-white text-xs truncate">
                        {user?.fullName || 'Government Officer'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user?.email || 'officer@gov.in'}
                      </div>
                      <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                        {user?.department || 'CDSCO HQ • REGULATORY CELL'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Theme Selector Section */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider px-1 block mb-2">
                    Interface Theme
                  </span>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        if (theme === 'dark') toggleTheme();
                      }}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                        theme === 'light'
                          ? 'bg-white text-amber-800 shadow-sm border border-slate-200'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Light</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (theme === 'light') toggleTheme();
                      }}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                        theme === 'dark'
                          ? 'bg-[#152745] text-blue-400 shadow-sm border border-blue-500/40'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-blue-400" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Quick Navigation Items */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/keys');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <span className="flex items-center gap-2.5">
                      <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Keystore Root of Trust</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">FIPS 140-2</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/audit-logs');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Statutory Audit Trail</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">CSV</span>
                  </button>
                </div>

                {/* Terminate Session Button */}
                <div className="p-2 bg-slate-50/50 dark:bg-[#071326]/60">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/70 rounded-xl transition-all border border-rose-200/80 dark:border-rose-900/60"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      <span>Terminate Officer Session</span>
                    </div>
                    <span className="text-[9px] font-mono font-black bg-rose-100 dark:bg-rose-900/80 px-1.5 py-0.5 rounded">
                      LOGOUT
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
