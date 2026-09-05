import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useAuth } from '../../features/auth/hooks/auth.hooks';
import {
  LayoutDashboard,
  Boxes,
  PlusCircle,
  QrCode,
  Search,
  Database,
  AlertOctagon,
  BellRing,
  BarChart3,
  FileSpreadsheet,
  Building2,
  KeyRound,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Radio,
  LogOut,
  Settings,
} from 'lucide-react';
import { NavRoute } from '../../features/dashboard/slice/dashboard.slice';

interface NavItem {
  id: NavRoute;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const {
    activeRoute,
    navigateTo,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    recalls,
    alerts,
    profile,
  } = useDashboard();

  const { user, kycStatus, logout } = useAuth();

  const handleNav = (id: NavRoute) => {
    navigateTo(id);
    setIsMobileSidebarOpen(false);
  };

  const activeRecallsCount = recalls.filter((r) => r.status === 'ACTIVE').length;
  const unresolvedAlertsCount = alerts.filter((a) => !a.resolved).length;

  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Manufacturing & Catalog',
      items: [
        { id: 'batches', label: 'Batches & Production', icon: <Boxes className="w-4 h-4" /> },
        { id: 'create-batch', label: 'Create Production Batch', icon: <PlusCircle className="w-4 h-4" /> },
        { id: 'inventory', label: 'Formulations Catalog', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'qr-codes', label: 'QR Packaging Hub', icon: <QrCode className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Blockchain & Compliance',
      items: [
        { id: 'ledger', label: 'Fabric Blockchain Ledger', icon: <Database className="w-4 h-4" /> },
        {
          id: 'recalls',
          label: 'Recall Command Center',
          icon: <AlertOctagon className="w-4 h-4" />,
          badge: activeRecallsCount > 0 ? activeRecallsCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
      ],
    },
    {
      title: 'Facility Administration',
      items: [
        { id: 'settings', label: 'Settings & Key Vault', icon: <ShieldCheck className="w-4 h-4" /> },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] text-[var(--text-primary)] select-none border-r border-[var(--border)]">
      {/* Brand Header */}
      <div
        className={`p-3.5 flex items-center ${
          isSidebarCollapsed ? 'flex-col justify-center gap-3 py-4' : 'justify-between'
        } border-b border-[var(--border)] min-h-[64px]`}
      >
        <div
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer overflow-hidden"
          title="PharmaChain"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-xs shadow-md shadow-emerald-600/20 shrink-0">
            PC
          </div>
          {!isSidebarCollapsed && (
            <div className="truncate">
              <h1 className="font-extrabold text-sm tracking-tight text-[var(--text-primary)] truncate">
                PharmaChain
              </h1>
              <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold truncate">
                Manufacturer Portal
              </p>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)] transition-colors shrink-0"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {!isSidebarCollapsed && (
              <h2 className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                {section.title}
              </h2>
            )}

            {section.items.map((item) => {
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)]'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                        item.badgeColor || 'bg-slate-700 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Profile, Settings & Administration Section */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-element)] space-y-2">
        {!isSidebarCollapsed ? (
          <>
            <div className="flex items-center justify-between">
              <div
                onClick={() => handleNav('profile')}
                className="flex items-center gap-2 min-w-0 cursor-pointer group flex-1 mr-2"
                title="Manage Company Legal Profile"
              >
                <div
                  className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ${
                    kycStatus === 'APPROVED' ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                >
                  {(user?.name || profile.name).slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate text-xs">
                  <div className="font-semibold text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors truncate">
                    {user?.name || profile.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                    {user?.licenseNumber || profile.licenseNumber}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleNav('security')}
                  title="Cryptographic Key Vault & Security"
                  className={`p-1.5 rounded-lg transition-colors ${
                    activeRoute === 'security'
                      ? 'bg-emerald-600 text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <button
                onClick={() => handleNav('profile')}
                className={`px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                  activeRoute === 'profile'
                    ? 'bg-emerald-600 text-white'
                    : kycStatus === 'APPROVED'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                }`}
              >
                Settings & License
              </button>
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                <Radio className="w-2 h-2 text-emerald-400 animate-pulse" />
                <span>Fabric 2.5</span>
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => handleNav('profile')}
              title="Company Profile & Settings"
              className={`p-2 rounded-xl transition-colors ${
                activeRoute === 'profile'
                  ? 'bg-emerald-600 text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <Building2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleNav('security')}
              title="Key Vault & Security"
              className={`p-2 rounded-xl transition-colors ${
                activeRoute === 'security'
                  ? 'bg-emerald-600 text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--bg-surface)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 shrink-0 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div
          className={`fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
