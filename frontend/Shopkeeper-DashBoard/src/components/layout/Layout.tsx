import React, { useState } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Dashboard } from '../../features/dashboard/components/Dashboard';
import { POSTerminalView } from '../pos/POSTerminalView';
import { InboundIntakeView } from '../intake/InboundIntakeView';
import { MedicineInventoryView } from '../inventory/MedicineInventoryView';
import { SalesHistoryView } from '../sales/SalesHistoryView';
import { RecallHubView } from '../recalls/RecallHubView';
import { PharmacyProfileView } from '../settings/PharmacyProfileView';
import { SecuritySettingsView } from '../settings/SecuritySettingsView';

import { WebScannerModal } from '../pos/WebScannerModal';
import { ReceiptModal } from '../pos/ReceiptModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { HelpSupportModal } from './HelpSupportModal';
import { ToastContainer } from '../common/Toast';

export const Layout: React.FC = () => {
  const { activeRoute } = useDashboard();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos':
        return <POSTerminalView />;
      case 'intake':
        return <InboundIntakeView />;
      case 'inventory':
        return <MedicineInventoryView />;
      case 'sales':
        return <SalesHistoryView />;
      case 'recalls':
        return <RecallHubView />;
      case 'profile':
        return <PharmacyProfileView />;
      case 'security':
        return <SecuritySettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Navigation Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onToggleMobileMenu={() => setIsMobileNavOpen((prev: boolean) => !prev)} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderActiveView()}</div>
        </main>
      </div>

      {/* 3. Global Modals & Notifications */}
      <WebScannerModal />
      <ReceiptModal />
      <GlobalSearchModal />
      <HelpSupportModal />
      <ToastContainer />
    </div>
  );
};
