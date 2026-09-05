import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Batch,
  RecallRecord,
  QualityAlert,
  B2BOrder,
  InventoryItem,
  ManufacturerProfile,
  DashboardStats,
} from '../../../types';

/**
 * Read the active route directly from the URL at store-creation time.
 * This is synchronous and runs before React even mounts, so there is never
 * a moment where Redux thinks the route is 'dashboard' while the URL says
 * 'batch-detail' — eliminating the batchId-wipe race condition.
 */
const getInitialRouteFromUrl = (): NavRoute => {
  if (typeof window === 'undefined') return 'dashboard';
  const params = new URLSearchParams(window.location.search);
  const route = params.get('route') as NavRoute | null;
  const validRoutes: NavRoute[] = [
    'dashboard', 'batches', 'batch-detail', 'create-batch', 'inventory',
    'qr-codes', 'traceability', 'ledger', 'recalls', 'alerts',
    'analytics', 'reports', 'orders', 'profile', 'security', 'settings',
  ];
  return route && validRoutes.includes(route) ? route : 'dashboard';
};

export type NavRoute =
  | 'dashboard'
  | 'batches'
  | 'batch-detail'
  | 'create-batch'
  | 'inventory'
  | 'qr-codes'
  | 'traceability'
  | 'ledger'
  | 'recalls'
  | 'alerts'
  | 'analytics'
  | 'reports'
  | 'orders'
  | 'profile'
  | 'security'
  | 'settings';

export interface DashboardState {
  activeRoute: NavRoute;
  theme: 'dark' | 'light';
  stats: DashboardStats;
  batches: Batch[];
  recalls: RecallRecord[];
  alerts: QualityAlert[];
  orders: B2BOrder[];
  inventory: InventoryItem[];
  profile: ManufacturerProfile;
  selectedBatch: Batch | null;
  batchToRecall: Batch | null;
  dateRange: 'Today' | '7 Days' | '30 Days' | 'Custom';
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  isSearchModalOpen: boolean;
  isHelpModalOpen: boolean;
  isRecallModalOpen: boolean;
  loading: boolean;
  error: string | null;
}

const emptyStats: DashboardStats = {
  totalBatches: 0,
  mintedPacksNumber: 0,
  mintedPacks: '0',
  activeRecalls: 0,
  recalledBatches: 0,
  totalRevenue: '₹0',
  activeDispatches: 0,
  activeOrders: 0,
  verificationRate: '0%',
  failedVerifications: 0,
  criticalAlerts: 0,
  activeQualityAlerts: 0,
  inventoryUtilization: '0%',
  warehouseCapacity: '0 / 250,000 packs',
  ledgerBlocks: 0,
};

const emptyProfile: ManufacturerProfile = {
  id: '',
  name: 'Manufacturer Account',
  code: 'MFR-001',
  email: '',
  licenseNumber: 'CDSCO-MFG-PENDING',
  kycStatus: 'APPROVED',
  keyId: '',
  keyAlgorithm: 'ES256 (ECDSA P-256)',
  publicKeyPem: '',
  keyStatus: 'Protected in AES-256-GCM Vault',
  headquarters: '',
  plantLocations: [],
  authorizedPersonnel: [],
  registeredAt: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
  gstin: '',
  cdscoRegistration: '',
};

const initialState: DashboardState = {
  activeRoute: getInitialRouteFromUrl(),
  theme: 'light',
  stats: emptyStats,
  batches: [],
  recalls: [],
  alerts: [],
  orders: [],
  inventory: [],
  profile: emptyProfile,
  selectedBatch: null,
  batchToRecall: null,
  dateRange: '30 Days',
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  isSearchModalOpen: false,
  isHelpModalOpen: false,
  isRecallModalOpen: false,
  loading: false,
  error: null,
};

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardData(
      state,
      action: PayloadAction<Partial<{
        stats: DashboardStats;
        batches: Batch[];
        recalls: RecallRecord[];
        alerts: QualityAlert[];
        orders: B2BOrder[];
        inventory: InventoryItem[];
        profile: ManufacturerProfile;
      }>>
    ) {
      if (action.payload.stats) state.stats = action.payload.stats;
      if (action.payload.batches) state.batches = action.payload.batches;
      if (action.payload.recalls) state.recalls = action.payload.recalls;
      if (action.payload.alerts) state.alerts = action.payload.alerts;
      if (action.payload.orders) state.orders = action.payload.orders;
      if (action.payload.inventory) state.inventory = action.payload.inventory;
      if (action.payload.profile) state.profile = action.payload.profile;
      state.loading = false;
      state.error = null;
    },
    setDashboardLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setDashboardError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    addBatch(state, action: PayloadAction<Batch>) {
      // Prepend to batches array
      state.batches = [action.payload, ...state.batches.filter((b) => b.id !== action.payload.id)];
      state.stats.totalBatches = state.batches.length;
      const totalPacks = state.batches.reduce((sum, b) => sum + (b.packsMinted || 0), 0);
      state.stats.mintedPacksNumber = totalPacks;
      state.stats.mintedPacks = totalPacks >= 1000 ? `${(totalPacks / 1000).toFixed(0)}k` : `${totalPacks}`;
    },
    updateBatch(state, action: PayloadAction<Batch>) {
      state.batches = state.batches.map((b) => (b.id === action.payload.id ? action.payload : b));
      if (state.selectedBatch?.id === action.payload.id) {
        state.selectedBatch = action.payload;
      }
    },
    removeBatch(state, action: PayloadAction<string>) {
      state.batches = state.batches.filter((b) => b.id !== action.payload);
      state.stats.totalBatches = state.batches.length;
      if (state.selectedBatch?.id === action.payload) {
        state.selectedBatch = null;
      }
    },
    addRecall(state, action: PayloadAction<RecallRecord>) {
      state.recalls = [action.payload, ...state.recalls];
      state.batches = state.batches.map((b) =>
        b.id === action.payload.batchId ? { ...b, mintStatus: 'RECALLED', recallReason: action.payload.reason } : b
      );
      state.stats.recalledBatches = state.batches.filter((b) => b.mintStatus === 'RECALLED').length;
      state.stats.activeRecalls = state.stats.recalledBatches;
    },
    updateOrderStatus(
      state,
      action: PayloadAction<{ orderId: string; status: B2BOrder['status'] }>
    ) {
      state.orders = state.orders.map((o) =>
        o.id === action.payload.orderId ? { ...o, status: action.payload.status } : o
      );
    },
    resolveAlert(state, action: PayloadAction<string>) {
      state.alerts = state.alerts.filter((a) => a.id !== action.payload);
      state.stats.activeQualityAlerts = state.alerts.length;
    },
    setActiveRoute(state, action: PayloadAction<NavRoute>) {
      state.activeRoute = action.payload;
    },
    setTheme(state, _action: PayloadAction<'dark' | 'light'>) {
      state.theme = 'light';
    },
    setSelectedBatch(state, action: PayloadAction<Batch | null>) {
      state.selectedBatch = action.payload;
    },
    setBatchToRecall(state, action: PayloadAction<Batch | null>) {
      state.batchToRecall = action.payload;
    },
    setDateRange(state, action: PayloadAction<'Today' | '7 Days' | '30 Days' | 'Custom'>) {
      state.dateRange = action.payload;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.isSidebarCollapsed = action.payload;
    },
    toggleSidebar(state) {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setMobileSidebarOpen(state, action: PayloadAction<boolean>) {
      state.isMobileSidebarOpen = action.payload;
    },
    setSearchModalOpen(state, action: PayloadAction<boolean>) {
      state.isSearchModalOpen = action.payload;
    },
    setHelpModalOpen(state, action: PayloadAction<boolean>) {
      state.isHelpModalOpen = action.payload;
    },
    setRecallModalOpen(state, action: PayloadAction<boolean>) {
      state.isRecallModalOpen = action.payload;
    },
  },
});

export const {
  setDashboardData,
  setDashboardLoading,
  setDashboardError,
  addBatch,
  updateBatch,
  removeBatch,
  addRecall,
  updateOrderStatus,
  resolveAlert,
  setActiveRoute,
  setTheme,
  setSelectedBatch,
  setBatchToRecall,
  setDateRange,
  setSidebarCollapsed,
  toggleSidebar,
  setMobileSidebarOpen,
  setSearchModalOpen,
  setHelpModalOpen,
  setRecallModalOpen,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
