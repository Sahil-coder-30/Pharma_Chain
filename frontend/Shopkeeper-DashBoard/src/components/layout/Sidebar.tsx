import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { useAuth } from '../../features/auth/hooks/auth.hooks';
import {
  LayoutDashboard,
  QrCode,
  ArrowDownToLine,
  Boxes,
  Receipt,
  AlertOctagon,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  User,
  ShieldAlert,
  X,
} from 'lucide-react';
import { NavRoute } from '../../types';

interface NavItemConfig {
  id: NavRoute;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onMobileClose }) => {
  const {
    activeRoute,
    navigateTo,
    isSidebarCollapsed,
    toggleSidebar,
    recalls,
    cartItems,
  } = useDashboard();
  const { user, logout } = useAuth();

  const activeRecallsCount = recalls.filter((r) => r.status === 'ACTIVE').length;

  const mainNav: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'pos',
      label: 'Counter POS Dispense',
      icon: <QrCode className="w-4 h-4 shrink-0 text-emerald-500" />,
      badge: cartItems.length > 0 ? cartItems.length : undefined,
    },
    {
      id: 'intake',
      label: 'Inbound Delivery Intake',
      icon: <ArrowDownToLine className="w-4 h-4 shrink-0 text-sky-500" />,
    },
    {
      id: 'inventory',
      label: 'Live Medicine Inventory',
      icon: <Boxes className="w-4 h-4 shrink-0 text-teal-500" />,
    },
    {
      id: 'sales',
      label: 'Sales & Dispensed Ledger',
      icon: <Receipt className="w-4 h-4 shrink-0 text-purple-500" />,
    },
    {
      id: 'recalls',
      label: 'CDSCO Recalls & Alerts',
      icon: <AlertOctagon className="w-4 h-4 shrink-0 text-rose-500" />,
      badge: activeRecallsCount > 0 ? activeRecallsCount : undefined,
    },
  ];

  const asideContent = (
    <aside
      className={`relative z-20 flex flex-col justify-between h-screen border-r border-[var(--border)] bg-[var(--bg-surface)] transition-all duration-300 select-none ${
        isSidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div
          className={`h-16 px-4 border-b border-[var(--border)] flex items-center ${
            isSidebarCollapsed ? 'flex-col justify-center gap-1' : 'justify-between'
          }`}
        >
          <div
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xs shadow-md shadow-emerald-600/20 shrink-0 ring-1 ring-white/20">
              PC
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-[var(--text-primary)] truncate block">
                  PharmaChain
                </span>
                <span className="text-[10px] text-[var(--text-muted)] truncate block font-mono">
                  Chemist Portal
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-element)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`hidden lg:flex p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-element)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 ${
              isSidebarCollapsed ? 'mt-1' : ''
            }`}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Item List */}
        <nav className="p-3 space-y-1">
          {mainNav.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigateTo(item.id);
                  onMobileClose?.();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)]'
                } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!isSidebarCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Utilities */}
      <div className="p-3 border-t border-[var(--border)] space-y-1.5">
        {/* Settings Links */}
        <button
          onClick={() => navigateTo('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeRoute === 'profile'
              ? 'bg-[var(--bg-element)] text-[var(--text-primary)] font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)]'
          } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          title="Pharmacy License & Profile"
        >
          <Store className="w-4 h-4 shrink-0 text-emerald-500" />
          {!isSidebarCollapsed && <span className="truncate">Pharmacy Profile</span>}
        </button>

        <button
          onClick={() => navigateTo('security')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeRoute === 'security'
              ? 'bg-[var(--bg-element)] text-[var(--text-primary)] font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-element)]'
          } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          title="POS Hardware & Security"
        >
          <ShieldCheck className="w-4 h-4 shrink-0 text-sky-500" />
          {!isSidebarCollapsed && <span className="truncate">POS Hardware Settings</span>}
        </button>

        {/* User Card */}
        <div
          className={`pt-2 border-t border-[var(--border)]/60 flex items-center ${
            isSidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!isSidebarCollapsed && (
            <div className="min-w-0 pr-2">
              <span className="font-bold text-xs text-[var(--text-primary)] truncate block">
                {user?.shopName || 'Apollo MedPlus'}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] truncate block font-mono">
                {user?.licenseNumber || 'DL-20-B-2023'}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-element)] transition-colors cursor-pointer shrink-0"
            title="Sign out of Terminal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex h-screen flex-shrink-0">
        {asideContent}
      </div>

      {/* Mobile Slide-over Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full max-w-[264px] w-full shadow-2xl animate-slideRight">
            {asideContent}
          </div>
        </div>
      )}
    </>
  );
};
