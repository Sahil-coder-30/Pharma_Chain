import React, { createContext, useContext, useState } from 'react';
import {
  Batch,
  RecallRecord,
  QualityAlert,
  B2BOrder,
  InventoryItem,
  ManufacturerProfile,
  DashboardStats,
} from '../types';
import { useToast } from './ToastContext';
import { formatISTDateString, formatISTISOString } from '../features/dashboard/service/dashboard.api';

export type NavItem =
  | 'dashboard'
  | 'batches'
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

interface DashboardContextType {
  activeNav: NavItem;
  setActiveNav: (nav: NavItem) => void;
  batches: Batch[];
  recalls: RecallRecord[];
  alerts: QualityAlert[];
  orders: B2BOrder[];
  inventory: InventoryItem[];
  profile: ManufacturerProfile;
  stats: DashboardStats;
  dateRange: 'Today' | '7 Days' | '30 Days' | 'Custom';
  setDateRange: (range: 'Today' | '7 Days' | '30 Days' | 'Custom') => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  selectedBatch: Batch | null;
  setSelectedBatch: (batch: Batch | null) => void;
  isRecallModalOpen: boolean;
  setIsRecallModalOpen: (open: boolean) => void;
  batchToRecall: Batch | null;
  setBatchToRecall: (batch: Batch | null) => void;
  addBatch: (batch: Batch) => void;
  initiateRecall: (batchId: string, reason: string, severity: 'CRITICAL' | 'MAJOR' | 'MODERATE') => void;
  updateOrderStatus: (orderId: string, newStatus: B2BOrder['status']) => void;
  resolveAlert: (alertId: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recalls, setRecalls] = useState<RecallRecord[]>([]);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [orders, setOrders] = useState<B2BOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile] = useState<ManufacturerProfile>({
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
    registeredAt: formatISTDateString(),
    gstin: '',
    cdscoRegistration: '',
  });
  const [stats, setStats] = useState<DashboardStats>({
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
  });
  const [dateRange, setDateRange] = useState<'Today' | '7 Days' | '30 Days' | 'Custom'>('30 Days');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [batchToRecall, setBatchToRecall] = useState<Batch | null>(null);

  const addBatch = (newBatch: Batch) => {
    setBatches((prev) => [newBatch, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalBatches: prev.totalBatches + 1,
    }));
    showToast({
      type: 'success',
      title: 'Batch Registered Successfully',
      message: `${newBatch.id} (${newBatch.medicineName}) created and queued for minting.`,
    });
  };

  const initiateRecall = (batchId: string, reason: string, severity: 'CRITICAL' | 'MAJOR' | 'MODERATE') => {
    const targetBatch = batches.find((b) => b.id === batchId);
    if (!targetBatch) return;

    // Update batch status to RECALLED
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? {
              ...b,
              mintStatus: 'RECALLED',
              recallReason: reason,
              recallDate: formatISTISOString(),
            }
          : b
      )
    );

    // Create recall record
    const newRecall: RecallRecord = {
      id: `REC-2026-${String(recalls.length + 1).padStart(3, '0')}`,
      batchId,
      medicineName: targetBatch.medicineName,
      dosage: targetBatch.dosage,
      reason,
      date: formatISTISOString(),
      affectedPacks: targetBatch.totalQuantity,
      status: 'ACTIVE',
      initiatedBy: `${profile.authorizedPersonnel[0].name} (${profile.authorizedPersonnel[0].role})`,
      severity,
      quarantineActionsTaken: [
        `Fabric Ledger :RECALL state appended at block #${Math.floor(18420 + Math.random() * 100)}`,
        'Immediate POS sale lock broadcasted to all pharmacies',
        'CDSCO incident report generated',
      ],
    };

    setRecalls((prev) => [newRecall, ...prev]);
    setStats((prev) => ({
      ...prev,
      recalledBatches: prev.recalledBatches + 1,
    }));

    showToast({
      type: 'error',
      title: 'Batch Recall Broadcasted',
      message: `Recall active for ${batchId}. Immutable :RECALL transition appended to blockchain.`,
      duration: 6000,
    });
  };

  const updateOrderStatus = (orderId: string, newStatus: B2BOrder['status']) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: newStatus,
              dispatchedAt: newStatus === 'SHIPPED' ? formatISTISOString() : ord.dispatchedAt,
              trackingNumber: newStatus === 'SHIPPED' ? `TRK-BLUEDART-${Math.floor(1000000 + Math.random() * 9000000)}` : ord.trackingNumber,
            }
          : ord
      )
    );

    showToast({
      type: 'info',
      title: 'Order Status Updated',
      message: `Order ${orderId} status changed to ${newStatus}.`,
    });
  };

  const resolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alt) => (alt.id === alertId ? { ...alt, resolved: true } : alt))
    );
    showToast({
      type: 'success',
      title: 'Alert Resolved',
      message: `Incident ${alertId} marked as resolved.`,
    });
  };

  return (
    <DashboardContext.Provider
      value={{
        activeNav,
        setActiveNav,
        batches,
        recalls,
        alerts,
        orders,
        inventory,
        profile,
        stats,
        dateRange,
        setDateRange,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isSearchOpen,
        setIsSearchOpen,
        isHelpOpen,
        setIsHelpOpen,
        selectedBatch,
        setSelectedBatch,
        isRecallModalOpen,
        setIsRecallModalOpen,
        batchToRecall,
        setBatchToRecall,
        addBatch,
        initiateRecall,
        updateOrderStatus,
        resolveAlert,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export { useDashboard } from '../features/dashboard/Hooks/dashboard.hooks';

