import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Factory,
  Store,
  ScrollText,
  KeyRound,
  LogOut,
  AlertCircle,
  ChevronRight,
  Landmark,
  X,
} from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext';
import { useAuth } from '../../context/AuthContext';
import { PharmaChainLogo } from '../common/PharmaChainLogo';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen = false, onClose }) => {
  const { stats } = useAdminData();
  const { logout } = useAuth();

  const pendingMfrs = stats?.manufacturers.pending ?? 0;
  const pendingShops = stats?.shopkeepers.pending ?? 0;
  const totalPending = pendingMfrs + pendingShops;
  const totalNodes = (stats?.manufacturers.approved ?? 0) + (stats?.shopkeepers.approved ?? 0);

  const navItems = [
    {
      to: '/dashboard',
      label: 'Executive Command',
      sublabel: 'National Overview',
      icon: LayoutDashboard,
      accentColor: 'from-blue-500 to-indigo-600',
    },
    {
      to: '/manufacturers',
      label: 'Manufacturer KYC',
      sublabel: 'License & Key Approvals',
      icon: Factory,
      badge: pendingMfrs > 0 ? pendingMfrs : undefined,
      badgeColor: 'bg-amber-600 text-white shadow-xs',
      accentColor: 'from-amber-500 to-amber-600',
    },
    {
      to: '/shopkeepers',
      label: 'Pharmacy Approvals',
      sublabel: 'Retail & Wholesale SLA',
      icon: Store,
      badge: pendingShops > 0 ? pendingShops : undefined,
      badgeColor: 'bg-blue-600 text-white shadow-xs',
      accentColor: 'from-blue-600 to-teal-600',
    },
    {
      to: '/audit-logs',
      label: 'Compliance Ledger',
      sublabel: 'Regulatory Decision Trail',
      icon: ScrollText,
      accentColor: 'from-purple-500 to-indigo-600',
    },
    {
      to: '/keys',
      label: 'Keystore Root of Trust',
      sublabel: 'ECDSA P-256 Certificates',
      icon: KeyRound,
      accentColor: 'from-emerald-500 to-teal-600',
    },
  ];

  const sidebarContent = (
    <aside
      className={`w-72 bg-white dark:bg-[#07152b] text-slate-800 dark:text-white flex flex-col flex-shrink-0 border-r border-slate-200/90 dark:border-[#14294a] h-full max-h-screen overflow-hidden relative z-20 shadow-md select-none transition-colors duration-200`}
    >
      {/* Brand Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 dark:border-[#14294a] bg-slate-50/80 dark:bg-gradient-to-b dark:from-[#0a1d3d] dark:to-[#07152b] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0b172a] p-1.5 shadow-md shadow-emerald-500/10 flex items-center justify-center border border-slate-200 dark:border-slate-800 flex-shrink-0">
              <PharmaChainLogo size={28} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm tracking-wide text-slate-900 dark:text-white">
                  PHARMACHAIN
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-xs">
                  CDSCO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase mt-0.5 truncate">
                National Drug Verification
              </p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Security Directorate Clearance Tag */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-[#14294a]/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            NODE-01 • RAFT CLUSTER
          </span>
          <span className="text-amber-700 dark:text-amber-400/90 font-black font-mono text-[9px] bg-amber-100 dark:bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-400/20">
            FIPS 140-2
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto min-h-0">
        <div className="px-3 pb-1.5 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-amber-500" />
            Regulatory Modules
          </span>
          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{totalNodes} Nodes</span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50/30 dark:from-[#122e5a] dark:to-[#0e2448] text-blue-900 dark:text-white shadow-xs border-l-4 border-amber-500'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0f2347] hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? `bg-gradient-to-tr ${item.accentColor} text-white shadow-xs`
                          : 'bg-slate-100 dark:bg-[#102344] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white border border-slate-200 dark:border-[#1a3766]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="tracking-wide block truncate text-xs">{item.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal truncate">{item.sublabel}</span>
                    </div>
                  </div>

                  {item.badge !== undefined ? (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Queue SLA Telemetry Meter */}
      <div className="flex-shrink-0 mx-3 mb-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-gradient-to-b dark:from-[#0e2448] dark:to-[#091a36] border border-slate-200/90 dark:border-[#1a3869] text-xs shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Statutory Verification</span>
          </div>
          <span className="text-[10px] font-mono font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-200 dark:border-transparent">
            {totalPending} Tasks
          </span>
        </div>
        <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug mb-2 font-medium">
          {totalPending > 0
            ? `${totalPending} applications require inspection.`
            : 'All regional regulatory queues are cleared.'}
        </p>

        {/* Mini progress bar */}
        <div className="w-full bg-slate-200 dark:bg-[#071326] h-1.5 rounded-full overflow-hidden border border-slate-300 dark:border-[#183664]">
          <div
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{
              width: totalPending === 0 ? '100%' : `${Math.max(15, Math.min(85, (1 - totalPending / 10) * 100))}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
          <span>SLA Target: 24h</span>
          <span>99.8% On-Time</span>
        </div>
      </div>

      {/* Footer / Officer Session */}
      <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-[#14294a] bg-slate-50/50 dark:bg-[#051021]">
        <button
          onClick={logout}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/80 hover:text-rose-700 dark:hover:text-rose-200 rounded-xl transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-700/50 group"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
            <span>Terminate Session</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-300 font-bold">LOGOUT</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex h-full flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Slide-over Drawer with Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full max-w-[288px] w-full shadow-2xl animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
