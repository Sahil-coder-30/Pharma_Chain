import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  NavRoute,
  ShopInventoryItem,
  SaleTransaction,
  InboundIntakeEvent,
  ShopRecallAlert,
  FraudIncidentReport,
  POSCartItem,
  ScanVerificationResponse,
  ScanMode,
} from '../../../types';

interface DashboardState {
  activeRoute: NavRoute;
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  theme: 'dark' | 'light';

  // Core Data
  inventory: ShopInventoryItem[];
  sales: SaleTransaction[];
  inbounds: InboundIntakeEvent[];
  recalls: ShopRecallAlert[];
  fraudReports: FraudIncidentReport[];

  // POS Terminal State
  cartItems: POSCartItem[];
  activeScanMode: ScanMode;
  currentScanResult: ScanVerificationResponse | null;
  activeReceipt: SaleTransaction | null;

  // Modals
  isScanModalOpen: boolean;
  isReceiptModalOpen: boolean;
  isIncidentModalOpen: boolean;
  isSearchOpen: boolean;
  isHelpOpen: boolean;

  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  activeRoute: 'dashboard',
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',

  inventory: [],
  sales: [],
  inbounds: [],
  recalls: [],
  fraudReports: [],

  cartItems: [],
  activeScanMode: 'DISPENSE',
  currentScanResult: null,
  activeReceipt: null,

  isScanModalOpen: false,
  isReceiptModalOpen: false,
  isIncidentModalOpen: false,
  isSearchOpen: false,
  isHelpOpen: false,

  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setActiveRoute: (state, action: PayloadAction<NavRoute>) => {
      state.activeRoute = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileSidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
    },
    setActiveScanMode: (state, action: PayloadAction<ScanMode>) => {
      state.activeScanMode = action.payload;
    },
    setCurrentScanResult: (
      state,
      action: PayloadAction<ScanVerificationResponse | null>
    ) => {
      state.currentScanResult = action.payload;
    },

    setInventory: (state, action: PayloadAction<ShopInventoryItem[]>) => {
      state.inventory = action.payload;
    },
    setSales: (state, action: PayloadAction<SaleTransaction[]>) => {
      state.sales = action.payload;
    },
    setInbounds: (state, action: PayloadAction<InboundIntakeEvent[]>) => {
      state.inbounds = action.payload;
    },
    setRecalls: (state, action: PayloadAction<ShopRecallAlert[]>) => {
      state.recalls = action.payload;
    },
    setFraudReports: (state, action: PayloadAction<FraudIncidentReport[]>) => {
      state.fraudReports = action.payload;
    },

    // Cart Reducers for POS Dispensing
    addToCart: (state, action: PayloadAction<POSCartItem>) => {
      const existing = state.cartItems.find(
        (it) => it.packHash === action.payload.packHash
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.cartItems.push(action.payload);
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cartItems = state.cartItems.filter(
        (it) => it.packHash !== action.payload
      );
    },
    clearCart: (state) => {
      state.cartItems = [];
    },

    // Inbound Stock Add
    addInboundEvent: (state, action: PayloadAction<InboundIntakeEvent>) => {
      state.inbounds.unshift(action.payload);
      // Upsert inventory
      const inv = state.inventory.find((i) => i.batchId === action.payload.batchId);
      if (inv) {
        inv.packCount += action.payload.packsReceived;
        inv.status = 'IN_STOCK';
        inv.lastIntakeDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      }
    },

    // Complete Sale Transaction
    addSaleTransaction: (state, action: PayloadAction<SaleTransaction>) => {
      state.sales.unshift(action.payload);
      state.activeReceipt = action.payload;
      state.isReceiptModalOpen = true;
      state.cartItems = []; // clear cart after sale

      // Decrement inventory stock counts
      action.payload.items.forEach((item) => {
        const inv = state.inventory.find((i) => i.batchId === item.batchId);
        if (inv) {
          inv.packCount = Math.max(0, inv.packCount - item.quantity);
          if (inv.packCount === 0) inv.status = 'OUT_OF_STOCK';
          else if (inv.packCount < 15) inv.status = 'LOW_STOCK';
        }
      });
    },

    // Modals
    setIsScanModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isScanModalOpen = action.payload;
    },
    setIsReceiptModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isReceiptModalOpen = action.payload;
    },
    setIsIncidentModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isIncidentModalOpen = action.payload;
    },
    setIsSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.isSearchOpen = action.payload;
    },
    setIsHelpOpen: (state, action: PayloadAction<boolean>) => {
      state.isHelpOpen = action.payload;
    },
    setActiveReceipt: (state, action: PayloadAction<SaleTransaction | null>) => {
      state.activeReceipt = action.payload;
    },

    setDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setDashboardError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setActiveRoute,
  toggleSidebar,
  setMobileSidebarOpen,
  setTheme,
  setActiveScanMode,
  setCurrentScanResult,
  setInventory,
  setSales,
  setInbounds,
  setRecalls,
  setFraudReports,
  addToCart,
  removeFromCart,
  clearCart,
  addInboundEvent,
  addSaleTransaction,
  setIsScanModalOpen,
  setIsReceiptModalOpen,
  setIsIncidentModalOpen,
  setIsSearchOpen,
  setIsHelpOpen,
  setActiveReceipt,
  setDashboardLoading,
  setDashboardError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
