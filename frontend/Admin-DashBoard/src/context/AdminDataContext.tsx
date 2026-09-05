import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  DashboardStats,
  ManufacturerRecord,
  ShopkeeperRecord,
  AuditLogEntry,
} from '../types/admin';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface AdminDataContextType {
  stats: DashboardStats | null;
  manufacturers: ManufacturerRecord[];
  shopkeepers: ShopkeeperRecord[];
  auditLogs: AuditLogEntry[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  getManufacturerById: (id: string) => Promise<ManufacturerRecord>;
  approveManufacturer: (id: string) => Promise<{ publicKeyPem: string }>;
  rejectManufacturer: (id: string, reason: string) => Promise<void>;
  blockManufacturer: (id: string, reason: string) => Promise<void>;
  unblockManufacturer: (id: string) => Promise<void>;
  approveShopkeeper: (id: string) => Promise<void>;
  rejectShopkeeper: (id: string, reason: string) => Promise<void>;
  suspendShopkeeper: (id: string, reason: string) => Promise<void>;
  unsuspendShopkeeper: (id: string) => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export const AdminDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [manufacturers, setManufacturers] = useState<ManufacturerRecord[]>([]);
  const [shopkeepers, setShopkeepers] = useState<ShopkeeperRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      const [statsRes, mfrsRes, shopsRes, logsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getManufacturers(),
        api.getShopkeepers(),
        api.getAuditLogs(),
      ]);

      setStats(statsRes);
      setManufacturers(mfrsRes.data);
      setShopkeepers(shopsRes.data);
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ── Manufacturer Live API Lookup ──────────────────────────────────────────
  const getManufacturerById = async (id: string): Promise<ManufacturerRecord> => {
    console.log(`[AdminDataContext] Fetching live manufacturer details via API for ID: ${id}`);
    const data = await api.getManufacturerById(id);
    return data;
  };

  // ── Approvals & Rejections ──────────────────────────────────────────────────
  const approveManufacturer = async (id: string): Promise<{ publicKeyPem: string }> => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await api.approveManufacturer(id, user);
      showToast({
        type: 'success',
        title: 'Manufacturer KYC Approved',
        message: `ECDSA P-256 digital signing key generated for ${res.manufacturer.companyName}.`,
      });
      await refreshData();
      return { publicKeyPem: res.publicKeyPem };
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'Could not provision signing key.',
      });
      throw err;
    }
  };

  const rejectManufacturer = async (id: string, reason: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await api.rejectManufacturer(id, reason, user);
      showToast({
        type: 'warning',
        title: 'Application Rejected',
        message: `KYC submission for ${res.manufacturer.companyName} marked as rejected.`,
      });
      await refreshData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'Could not update status.',
      });
      throw err;
    }
  };

  const blockManufacturer = async (id: string, reason: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await api.blockManufacturer(id, reason, user);
      showToast({
        type: 'error',
        title: 'Manufacturer Account Blocked',
        message: `${res.manufacturer.companyName} has been blocked and restricted from batch operations.`,
      });
      await refreshData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Block Action Failed',
        message: err.message || 'Could not block manufacturer account.',
      });
      throw err;
    }
  };

  const unblockManufacturer = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await api.unblockManufacturer(id, user);
      showToast({
        type: 'success',
        title: 'Manufacturer Account Unblocked',
        message: `${res.manufacturer.companyName} access and signing capabilities have been restored.`,
      });
      await refreshData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Unblock Failed',
        message: err.message || 'Could not restore manufacturer account access.',
      });
      throw err;
    }
  };

  const approveShopkeeper = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await api.approveShopkeeper(id, user);
      showToast({
        type: 'success',
        title: 'Pharmacy License Approved',
        message: `${res.shopkeeper.shopName} authorized for pharmaceutical distribution.`,
      });
      await refreshData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'Could not approve pharmacy.',
      });
      throw err;
    }
  };

  const rejectShopkeeper = async (id: string, reason: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await api.rejectShopkeeper(id, reason, user);
      showToast({
        type: 'warning',
        title: 'Pharmacy Application Rejected',
        message: `License registration for ${res.shopkeeper.shopName} rejected.`,
      });
      await refreshData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'Could not reject pharmacy.',
      });
      throw err;
    }
  };

  const suspendShopkeeper = async (id: string, reason: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await api.suspendShopkeeper(id, reason, user);
      showToast({
        type: 'error',
        title: 'Emergency License Suspended',
        message: `${res.shopkeeper.shopName} frozen from drug dispatch & verification.`,
      });
      await refreshData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Suspension Failed',
        message: err.message || 'Could not suspend pharmacy.',
      });
      throw err;
    }
  };

  const unsuspendShopkeeper = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const res = await api.unsuspendShopkeeper(id, user);
      showToast({
        type: 'success',
        title: 'Suspension Revoked',
        message: `Active license status restored for ${res.shopkeeper.shopName}.`,
      });
      await refreshData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not unsuspend pharmacy.',
      });
      throw err;
    }
  };

  return (
    <AdminDataContext.Provider
      value={{
        stats,
        manufacturers,
        shopkeepers,
        auditLogs,
        isLoading,
        refreshData,
        getManufacturerById,
        approveManufacturer,
        rejectManufacturer,
        blockManufacturer,
        unblockManufacturer,
        approveShopkeeper,
        rejectShopkeeper,
        suspendShopkeeper,
        unsuspendShopkeeper,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
};

export const useAdminData = (): AdminDataContextType => {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
};
