import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { ToastProvider } from './context/ToastContext';
import { useDashboard } from './features/dashboard/Hooks/dashboard.hooks';
import { useAuth } from './features/auth/hooks/auth.hooks';
import { useBlockStatusPoller } from './features/auth/hooks/useBlockStatusPoller';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/common/Toast';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { HelpSupportModal } from './components/layout/HelpSupportModal';
import { BatchDetailsModal } from './components/batches/BatchDetailsModal';
import { InitiateRecallModal } from './components/recall/InitiateRecallModal';
import { BlockedScreen } from './components/common/BlockedScreen';

// Auth Components
import { AuthLayout } from './features/auth/components/AuthLayout';

// Views
import { Dashboard } from './features/dashboard/components/Dashboard';
import { BatchesView } from './components/batches/BatchesView';
import { BatchDetailView } from './components/batches/BatchDetailView';
import { CreateBatchWizard } from './components/create-batch/CreateBatchWizard';
import { MedicineInventoryView } from './components/inventory/MedicineInventoryView';
import { QRCodeHubView } from './components/qr/QRCodeHubView';
import { BlockchainLedgerView } from './components/traceability/BlockchainLedgerView';
import { RecallCenterView } from './components/recall/RecallCenterView';
import { SettingsView } from './components/settings/SettingsView';
import { Clock, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

import './App.scss';
import './styles/BlockedScreen.scss';

// ── Inner orchestrator — has access to Redux store via hooks ───────────────────
const AppOrchestrator: React.FC = () => {
  const { activeRoute, navigateTo } = useDashboard();
  const { isAuthenticated, kycStatus, checkKYCStatus, user, blockedReason, blockedAt } = useAuth();

  // ── Real-time block status polling ────────────────────────────────────────
  // Polls GET /auth/me every 30 s. When the server reports BLOCKED the
  // poller dispatches setBlocked → kycStatus becomes 'BLOCKED' → blocked
  // screen renders immediately without page reload.
  useBlockStatusPoller();

  // Permanently enforce clean clinical light theme across the application
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  }, []);

  // ── Sync Redux activeRoute → browser URL ──────────────────────────────────────
  // Redux now initialises activeRoute directly from the URL (see dashboard.slice.ts),
  // so there is no restore step needed here. We just keep the URL in sync as the
  // user navigates, using pushState for new entries and replaceState when the
  // browser Back/Forward button triggered the route change.
  const isRestoringFromUrl = React.useRef(false);
  const isMounted = React.useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('route', activeRoute);
    if (activeRoute !== 'batch-detail') {
      params.delete('batchId');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;

    if (!isMounted.current) {
      // First render — URL already has the right route (Redux read it from here).
      // Just sync any params difference with replaceState; never push a duplicate entry.
      window.history.replaceState({ route: activeRoute }, '', newUrl);
      isMounted.current = true;
    } else if (isRestoringFromUrl.current) {
      // Back/Forward button — URL was already updated by the browser; just sync Redux params
      window.history.replaceState({ route: activeRoute }, '', newUrl);
      isRestoringFromUrl.current = false;
    } else {
      // Genuine user-initiated navigation — push a new history entry so Back works
      window.history.pushState({ route: activeRoute }, '', newUrl);
    }
  }, [activeRoute]);

  // ── Handle browser Back / Forward buttons ─────────────────────────────────────
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const routeInUrl = (params.get('route') as any) || 'dashboard';
      isRestoringFromUrl.current = true;
      navigateTo(routeInUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigateTo]);


  // ── BLOCKED: full-page suspension screen ────────────────────────────────────
  if (kycStatus === 'BLOCKED' || kycStatus === 'SUSPENDED') {
    return (
      <>
        <BlockedScreen
          reason={blockedReason ?? user?.blockedReason}
          blockedAt={blockedAt ?? user?.blockedAt}
          companyName={user?.name}
          email={user?.email}
        />
        <ToastContainer />
      </>
    );
  }

  // ── Not authenticated → Auth portal ────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <AuthLayout />
        <ToastContainer />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'batches':
        return <BatchesView />;
      case 'batch-detail':
        return <BatchDetailView />;
      case 'create-batch':
        return <CreateBatchWizard />;
      case 'inventory':
        return <MedicineInventoryView />;
      case 'qr-codes':
        return <QRCodeHubView />;
      case 'ledger':
      case 'traceability':
        return <BlockchainLedgerView />;
      case 'recalls':
        return <RecallCenterView />;
      case 'profile':
      case 'security':
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Top Banner: KYC PENDING */}
      {kycStatus === 'PENDING' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong className="text-amber-300">CDSCO KYC Application Pending Review</strong> — ES256 keypair vault provisioning and batch minting are locked until clearance.
            </span>
          </div>
          <button
            onClick={checkKYCStatus}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Check Verification Status</span>
          </button>
        </div>
      )}

      <Layout centerWorkspace={renderActiveView()} />

      {/* Global Modals & Portals */}
      <GlobalSearchModal />
      <HelpSupportModal />
      {activeRoute !== 'batch-detail' && <BatchDetailsModal />}
      <InitiateRecallModal />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ToastProvider>
        <AppOrchestrator />
      </ToastProvider>
    </Provider>
  );
};

export default App;
